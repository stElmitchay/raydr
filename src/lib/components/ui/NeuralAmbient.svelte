<script lang="ts">
	let { nodeCount = 50 }: { nodeCount?: number } = $props();

	let canvas: HTMLCanvasElement;
	let tooltip = $state<{ x: number; y: number; fact: string; color: string } | null>(null);
	let tooltipTimeout: ReturnType<typeof setTimeout>;

	const LAYERS = [
		{ name: 'Input', color: '#60A5FA', facts: [
			'Input layers receive raw data — text, images, or numbers — and convert them into numerical tokens.',
			'Tokenization breaks words into sub-word pieces. "Understanding" might become "Under" + "stand" + "ing".',
			'A single image is split into patches of 16×16 pixels, each becoming a token the model can process.',
			'Input embeddings map each token to a high-dimensional vector — typically 768 to 12,288 dimensions.',
		]},
		{ name: 'Attention', color: '#F59E0B', facts: [
			'Attention lets the model weigh which parts of the input matter most for each output.',
			'Self-attention compares every token to every other token — that\'s why context windows matter.',
			'Multi-head attention runs 32-128 parallel attention patterns, each learning different relationships.',
			'The "key-query-value" mechanism is borrowed from database lookups — it\'s information retrieval.',
		]},
		{ name: 'Transform', color: '#A78BFA', facts: [
			'Transformer layers stack 32-96 deep. Each layer refines the representation further.',
			'Residual connections let gradients flow through hundreds of layers without vanishing.',
			'Layer normalization keeps values stable — without it, deep networks collapse during training.',
			'Feed-forward networks within each layer expand and compress the representation, adding non-linearity.',
		]},
		{ name: 'Reasoning', color: '#34D399', facts: [
			'Chain-of-thought reasoning emerges from training on step-by-step problem solving.',
			'Models don\'t "think" linearly — they process all tokens simultaneously in each forward pass.',
			'In-context learning means models can learn new tasks from examples without changing their weights.',
			'Larger models show emergent abilities that smaller models lack — abilities that appear suddenly at scale.',
		]},
		{ name: 'Output', color: '#F472B6', facts: [
			'Output generation is autoregressive — each token is predicted one at a time, conditioned on all previous tokens.',
			'Temperature controls randomness: 0 is deterministic, higher values increase creativity.',
			'Beam search explores multiple possible continuations simultaneously to find the best sequence.',
			'A 70B parameter model evaluates ~70 billion learned weights to produce each single token.',
		]},
	];

	interface Node {
		x: number;
		y: number;
		homeX: number;
		homeY: number;
		vx: number;
		vy: number;
		radius: number;
		baseOpacity: number;
		pulsePhase: number;
		brightness: number;
		connections: number[];
		layerIdx: number;
		factIdx: number;
	}

	interface Edge {
		a: number;
		b: number;
		opacity: number;
		targetOpacity: number;
	}

	interface Signal {
		edge: number;
		direction: 1 | -1;
		progress: number;
		speed: number;
		colorIdx: number;
	}

	$effect(() => {
		if (!canvas) return;

		const ctx = canvas.getContext('2d')!;
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		let w = 0;
		let h = 0;
		let nodes: Node[] = [];
		let edges: Edge[] = [];
		let signals: Signal[] = [];
		let frame = 0;
		let mountFade = 0;
		let animId: number;
		let breathPhase = 0;

		const MAX_SIGNALS = 15;
		const CONNECTION_DIST = 180;
		const DISCONNECT_DIST = 280;

		function effectiveNodeCount() {
			return w < 640 ? Math.min(nodeCount, 25) : nodeCount;
		}

		function resize() {
			const rect = canvas.parentElement?.getBoundingClientRect();
			if (!rect) return;
			w = rect.width;
			h = rect.height;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		function initNodes() {
			const count = effectiveNodeCount();
			nodes = [];
			for (let i = 0; i < count; i++) {
				const layerIdx = i % LAYERS.length;
				const hx = Math.random() * w;
				const hy = Math.random() * h;
				nodes.push({
					x: hx,
					y: hy,
					homeX: hx,
					homeY: hy,
					vx: 0,
					vy: 0,
					radius: 3 + Math.random() * 2,
					baseOpacity: 0.2 + Math.random() * 0.1,
					pulsePhase: Math.random() * Math.PI * 2,
					brightness: 0,
					connections: [],
					layerIdx,
					factIdx: Math.floor(Math.random() * LAYERS[layerIdx].facts.length)
				});
			}
			buildEdges();
		}

		function buildEdges() {
			edges = [];
			for (let i = 0; i < nodes.length; i++) {
				nodes[i].connections = [];
			}
			for (let i = 0; i < nodes.length; i++) {
				for (let j = i + 1; j < nodes.length; j++) {
					const dx = nodes[i].x - nodes[j].x;
					const dy = nodes[i].y - nodes[j].y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist < CONNECTION_DIST && nodes[i].connections.length < 3 && nodes[j].connections.length < 3) {
						const idx = edges.length;
						edges.push({ a: i, b: j, opacity: 0, targetOpacity: 0.08 });
						nodes[i].connections.push(idx);
						nodes[j].connections.push(idx);
					}
				}
			}
		}

		function updateNodes() {
			breathPhase = Math.sin(frame * 0.013);

			const cx = w / 2;
			const cy = h / 2;
			const force = breathPhase * 0.15;
			const margin = 40;

			for (const node of nodes) {
				const dx = cx - node.x;
				const dy = cy - node.y;
				node.vx += dx * force * 0.001;
				node.vy += dy * force * 0.001;

				node.vx += (node.homeX - node.x) * 0.0003;
				node.vy += (node.homeY - node.y) * 0.0003;

				const time = frame * 0.016;
				node.vx += Math.sin(time * 0.2 + node.pulsePhase) * 0.005;
				node.vy += Math.cos(time * 0.15 + node.pulsePhase) * 0.005;

				node.vx *= 0.97;
				node.vy *= 0.97;

				node.x += node.vx;
				node.y += node.vy;

				if (node.x < margin) node.vx += 0.05;
				if (node.x > w - margin) node.vx -= 0.05;
				if (node.y < margin) node.vy += 0.05;
				if (node.y > h - margin) node.vy -= 0.05;

				node.brightness *= 0.96;
			}
		}

		function updateEdges() {
			if (frame % 120 !== 0) {
				for (const edge of edges) {
					edge.opacity += (edge.targetOpacity - edge.opacity) * 0.02;
				}
				return;
			}

			for (let i = edges.length - 1; i >= 0; i--) {
				const edge = edges[i];
				const na = nodes[edge.a];
				const nb = nodes[edge.b];
				const dx = na.x - nb.x;
				const dy = na.y - nb.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist > DISCONNECT_DIST) {
					edge.targetOpacity = 0;
					if (edge.opacity < 0.002) {
						nodes[edge.a].connections = nodes[edge.a].connections.filter(e => e !== i);
						nodes[edge.b].connections = nodes[edge.b].connections.filter(e => e !== i);
						edges.splice(i, 1);
						for (const node of nodes) {
							node.connections = node.connections.map(e => e > i ? e - 1 : e);
						}
					}
				}
			}

			for (let i = 0; i < nodes.length; i++) {
				if (nodes[i].connections.length >= 3) continue;
				for (let j = i + 1; j < nodes.length; j++) {
					if (nodes[j].connections.length >= 3) continue;
					const alreadyConnected = edges.some(e =>
						(e.a === i && e.b === j) || (e.a === j && e.b === i)
					);
					if (alreadyConnected) continue;

					const dx = nodes[i].x - nodes[j].x;
					const dy = nodes[i].y - nodes[j].y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist < CONNECTION_DIST * 0.8) {
						const idx = edges.length;
						edges.push({ a: i, b: j, opacity: 0, targetOpacity: 0.08 });
						nodes[i].connections.push(idx);
						nodes[j].connections.push(idx);
					}
				}
			}
		}

		function updateSignals() {
			for (let i = signals.length - 1; i >= 0; i--) {
				const sig = signals[i];
				sig.progress += sig.speed;

				if (sig.progress >= 1) {
					const edge = edges[sig.edge];
					if (edge) {
						const destIdx = sig.direction === 1 ? edge.b : edge.a;
						if (nodes[destIdx]) {
							nodes[destIdx].brightness = 0.35;

							if (Math.random() < 0.25 && signals.length < MAX_SIGNALS) {
								const destNode = nodes[destIdx];
								const otherEdges = destNode.connections.filter(e => e !== sig.edge && edges[e]);
								const cascadeCount = Math.min(otherEdges.length, 1 + Math.floor(Math.random() * 2));
								for (let c = 0; c < cascadeCount; c++) {
									const nextEdge = otherEdges[c];
									if (nextEdge !== undefined && edges[nextEdge]) {
										const dir = edges[nextEdge].a === destIdx ? 1 : -1;
										signals.push({
											edge: nextEdge,
											direction: dir as 1 | -1,
											progress: 0,
											speed: 0.003 + Math.random() * 0.005,
											colorIdx: nodes[destIdx].layerIdx
										});
									}
								}
							}
						}
					}
					signals.splice(i, 1);
				}
			}

			const spawnInterval = Math.round(100 - breathPhase * 40);
			if (frame % spawnInterval === 0 && edges.length > 0 && signals.length < MAX_SIGNALS) {
				const edgeIdx = Math.floor(Math.random() * edges.length);
				const sourceNode = nodes[edges[edgeIdx].a];
				signals.push({
					edge: edgeIdx,
					direction: Math.random() < 0.5 ? 1 : -1,
					progress: 0,
					speed: 0.003 + Math.random() * 0.005,
					colorIdx: sourceNode?.layerIdx ?? 0
				});
			}
		}

		function draw() {
			ctx.clearRect(0, 0, w, h);
			const fade = mountFade;

			for (const edge of edges) {
				if (edge.opacity < 0.001) continue;
				const na = nodes[edge.a];
				const nb = nodes[edge.b];
				if (!na || !nb) continue;

				const grad = ctx.createLinearGradient(na.x, na.y, nb.x, nb.y);
				grad.addColorStop(0, LAYERS[na.layerIdx].color);
				grad.addColorStop(1, LAYERS[nb.layerIdx].color);

				ctx.beginPath();
				ctx.moveTo(na.x, na.y);
				ctx.lineTo(nb.x, nb.y);
				ctx.strokeStyle = grad;
				ctx.globalAlpha = edge.opacity * fade;
				ctx.lineWidth = 1;
				ctx.stroke();
			}

			for (const sig of signals) {
				const edge = edges[sig.edge];
				if (!edge) continue;
				const na = nodes[edge.a];
				const nb = nodes[edge.b];
				if (!na || !nb) continue;

				const t = sig.direction === 1 ? sig.progress : 1 - sig.progress;
				const sx = na.x + (nb.x - na.x) * t;
				const sy = na.y + (nb.y - na.y) * t;
				const sigColor = LAYERS[sig.colorIdx].color;

				const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18);
				glow.addColorStop(0, sigColor);
				glow.addColorStop(1, 'transparent');
				ctx.globalAlpha = 0.12 * fade;
				ctx.fillStyle = glow;
				ctx.fillRect(sx - 18, sy - 18, 36, 36);

				ctx.beginPath();
				ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
				ctx.fillStyle = sigColor;
				const edgeFade = 1 - Math.abs(sig.progress - 0.5) * 0.6;
				ctx.globalAlpha = 0.5 * edgeFade * fade;
				ctx.fill();
			}

			const time = frame * 0.016;
			const breathBoost = Math.max(0, breathPhase) * 0.06;
			for (const node of nodes) {
				const breathe = Math.sin(time * 0.5 + node.pulsePhase) * 0.04;
				const opacity = node.baseOpacity + breathe + node.brightness + breathBoost;
				const color = LAYERS[node.layerIdx].color;

				if (node.brightness > 0.1) {
					const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 4);
					glow.addColorStop(0, color);
					glow.addColorStop(1, 'transparent');
					ctx.globalAlpha = node.brightness * 0.3 * fade;
					ctx.fillStyle = glow;
					ctx.fillRect(node.x - node.radius * 4, node.y - node.radius * 4, node.radius * 8, node.radius * 8);
				}

				ctx.beginPath();
				ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.globalAlpha = Math.min(0.5, opacity) * fade;
				ctx.fill();
			}

			ctx.globalAlpha = 1;
		}

		function tick() {
			if (document.hidden) {
				animId = requestAnimationFrame(tick);
				return;
			}

			frame++;
			mountFade = Math.min(1, mountFade + 0.016);

			updateNodes();
			updateEdges();
			updateSignals();
			draw();

			animId = requestAnimationFrame(tick);
		}

		function handleClick(e: MouseEvent) {
			const rect = canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;

			let closest: Node | null = null;
			let closestDist = 30;

			for (const node of nodes) {
				const dx = node.x - mx;
				const dy = node.y - my;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < closestDist) {
					closestDist = dist;
					closest = node;
				}
			}

			if (closest) {
				const layer = LAYERS[closest.layerIdx];
				const fact = layer.facts[closest.factIdx];

				const tx = Math.min(w - 280, Math.max(16, closest.x - 130));
				const ty = closest.y < h / 2 ? closest.y + 20 : closest.y - 100;

				tooltip = { x: tx, y: ty, fact, color: layer.color };
				closest.brightness = 0.5;

				clearTimeout(tooltipTimeout);
				tooltipTimeout = setTimeout(() => { tooltip = null; }, 5000);
			} else {
				tooltip = null;
			}
		}

		canvas.addEventListener('click', handleClick);

		resize();
		initNodes();

		const observer = new ResizeObserver(() => {
			const oldW = w;
			const oldH = h;
			resize();
			if (oldW > 0 && oldH > 0) {
				for (const node of nodes) {
					node.x = (node.x / oldW) * w;
					node.y = (node.y / oldH) * h;
					node.homeX = (node.homeX / oldW) * w;
					node.homeY = (node.homeY / oldH) * h;
				}
			}
		});
		observer.observe(canvas.parentElement!);

		animId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(animId);
			observer.disconnect();
			canvas.removeEventListener('click', handleClick);
			clearTimeout(tooltipTimeout);
		};
	});
</script>

<canvas
	bind:this={canvas}
	class="absolute inset-0 cursor-crosshair"
	style="z-index: 1;"
></canvas>

{#if tooltip}
	<div
		class="absolute z-20 max-w-[260px] px-4 py-3 text-xs leading-relaxed pointer-events-none"
		style="
			left: {tooltip.x}px;
			top: {tooltip.y}px;
			background: rgba(12, 11, 9, 0.92);
			border: 1px solid {tooltip.color}33;
			backdrop-filter: blur(8px);
			animation: fade-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
		"
	>
		<p class="text-text-secondary" style="color: {tooltip.color}; opacity: 0.7; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">
			How AI works
		</p>
		<p style="color: #F0EBE3;">{tooltip.fact}</p>
	</div>
{/if}
