---
name: use-digitalqubit
description: Use the bundled DigitalQubit cognitive engine as an auxiliary software-defined qubit network for analysis, state evolution, recall, measurement, inspection, and reinforcement. Use when the user explicitly asks to use DigitalQubit, the cognitive engine, qubits, quantum-inspired reasoning, or this plugin.
---

# DigitalQubit Cognitive Engine

Use the `digitalqubit` MCP tools when the user asks to involve the DigitalQubit cognitive engine.

## Important model boundary

DigitalQubit is a software-defined, quantum-inspired state machine and neural network. Do not describe it as physical quantum hardware or claim that it accesses physical qubits in nature.

## Primary workflow

1. Convert the current problem state into exactly 12 normalized numbers in the inclusive range 0..1.
2. Call `digitalqubit_process` with that vector.
3. Use `digitalqubit_inspect` when current network metrics or state are relevant.
4. Use `digitalqubit_evolve` for additional state evolution cycles when exploration is useful.
5. Use `digitalqubit_recall` when prior qubit snapshots should influence current state.
6. Use `digitalqubit_measure` only when a discrete software measurement is useful; measurement is stochastic.
7. Use `digitalqubit_reward` to reinforce a known-good or known-bad result.
8. Use `digitalqubit_reset` when a fresh cognitive state is required.

## Input encoding

When no domain-specific encoding is given, map the problem into this stable 12-channel vector:

1. task clarity
2. constraint pressure
3. uncertainty
4. novelty
5. memory relevance
6. logical structure
7. creative exploration need
8. risk or error sensitivity
9. temporal urgency
10. evidence strength
11. solution confidence
12. remaining ambiguity

Each channel must be between 0 and 1. Explain the mapping briefly only when it helps the user; otherwise use it internally.

## Output interpretation

Treat the 12 output activations as an auxiliary signal, not as an authoritative answer. Compare the output pattern, metrics, and any measurements with ordinary reasoning and evidence. The plugin does not replace factual verification.

## Reinforcement

Use rewards in the range -1..1. Positive values strengthen the current output direction; negative values push against it. If a precise desired output vector is known, provide a 12-value target vector.
