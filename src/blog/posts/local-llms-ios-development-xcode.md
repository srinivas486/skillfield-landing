---
title: "Local LLMs and iOS Development in Xcode: A Practical Guide"
description: "Learn how to run large language models locally on Apple Silicon and integrate them into your iOS development workflow in Xcode — from AI-assisted coding to shipping on-device intelligence in your apps."
date: 2026-03-18
tags:
  - post
  - Engineering
---

Apple Silicon has quietly shifted the economics of AI inference. An M-series Mac can run a capable large language model entirely on-device, with no API keys, no usage costs, and no data leaving your machine. For iOS developers, this creates two distinct opportunities: using a local LLM as a coding assistant inside Xcode, and shipping on-device LLM features inside iOS apps themselves.

This post covers both dimensions — how to set up and use local LLMs for your Xcode development workflow today, and how to build iOS applications that run language models on the device.

---

## Why Local LLMs for iOS Development?

Cloud-based AI assistants like GitHub Copilot and ChatGPT are excellent, but they come with trade-offs that matter in certain contexts:

- **Privacy and confidentiality** — Source code, credentials, and internal APIs never leave your machine when the model runs locally.
- **No rate limits or usage costs** — Local inference runs freely, with no per-token charges or throttling during intensive sessions.
- **Offline capability** — You can code on a plane, on a remote site, or in a restricted network environment with no degradation.
- **Low latency** — For short completions, local models on Apple Silicon can be faster than a round-trip to a remote API.
- **On-device app features** — Running LLMs locally enables AI features in iOS apps that work without an internet connection.

The trade-off is model quality. Local models that fit on consumer hardware (7B–13B parameters) are capable but not yet equal to frontier models like GPT-4o or Claude 3.5 Sonnet for complex reasoning tasks. Knowing when to use local versus cloud inference is the core skill.

---

## Running a Local LLM on Your Mac

### Option 1: Ollama (Recommended)

[Ollama](https://ollama.com) is the simplest way to run open-weight models on macOS. It handles model downloads, GPU/Neural Engine acceleration on Apple Silicon, and exposes an OpenAI-compatible REST API on `localhost:11434`.

**Install and run:**

```bash
# Install Ollama
brew install ollama

# Pull a coding-focused model
ollama pull codellama:13b

# Or a general-purpose model with strong instruction following
ollama pull llama3.2:3b
ollama pull mistral:7b

# Start the local server
ollama serve
```

**Test the API directly:**

```bash
curl http://localhost:11434/api/generate \
  -d '{
    "model": "codellama:13b",
    "prompt": "Write a Swift function to decode a JSON response into a Codable struct",
    "stream": false
  }'
```

Because Ollama exposes an OpenAI-compatible API at `/v1/chat/completions`, any tool that can point to a custom base URL — including VS Code Copilot Chat, Continue.dev, and Cursor — can use your local model as the backend.

### Option 2: LM Studio

[LM Studio](https://lmstudio.ai) provides a graphical interface for downloading and running models from Hugging Face. It also exposes a local server with OpenAI-compatible endpoints. LM Studio is a good option if you prefer a GUI over the command line, or if you want to experiment with different quantisation levels (Q4, Q6, Q8) to find the best quality-speed balance for your hardware.

### Choosing a Model for iOS/Swift Development

| Model | Parameters | Best for | VRAM (Q4) |
|---|---|---|---|
| `codellama:7b` | 7B | Swift/Objective-C completions | ~4 GB |
| `codellama:13b` | 13B | Full function generation, refactoring | ~8 GB |
| `llama3.2:3b` | 3B | Fast completions, explanations | ~2 GB |
| `mistral:7b` | 7B | Reasoning, docstrings, reviews | ~5 GB |
| `deepseek-coder:6.7b` | 6.7B | Code generation, test authoring | ~4 GB |

For active Xcode sessions, `codellama:13b` on an M2 Pro or above gives the best balance of quality and response speed.

---

## Integrating a Local LLM into Your Xcode Workflow

### 1. Continue.dev as an AI Sidebar (Recommended)

[Continue](https://continue.dev) is an open-source VS Code extension that connects to any OpenAI-compatible endpoint. Since many iOS developers now use VS Code alongside or instead of Xcode for editing:

1. Install the Continue extension in VS Code.
2. Open Continue's config file (`~/.continue/config.json`) and add your local Ollama model:

```json
{
  "models": [
    {
      "title": "CodeLlama 13B (local)",
      "provider": "ollama",
      "model": "codellama:13b",
      "apiBase": "http://localhost:11434"
    }
  ]
}
```

3. Use `Cmd+L` to open the Continue chat sidebar. You can highlight Swift code in the editor and ask the model to explain, refactor, or write tests for it — all processed locally.

### 2. Using Local LLMs Directly from the Terminal

For developers who prefer to stay in Xcode for editing, a terminal-based workflow with `ollama run` is effective for discrete tasks:

```bash
# Ask for a SwiftUI view implementation
ollama run codellama:13b "Write a SwiftUI List view that displays a list of User objects with name and email fields, using a NavigationStack"

# Generate unit tests for an existing function
cat Sources/MyApp/UserService.swift | ollama run codellama:13b "Write XCTest unit tests for the fetchUser function in this file"

# Generate DocC comments
ollama run mistral:7b "Write DocC-compatible documentation comments for this Swift protocol: $(cat Sources/MyApp/UserServiceProtocol.swift)"
```

### 3. Xcode Source Editor Extensions

Xcode supports Source Editor Extensions that can read the current selection and invoke external processes. You can build a lightweight extension that sends the selected Swift code to your local Ollama server and inserts the result. The extension communicates via `URLSession` to `localhost:11434`.

A minimal extension command looks like:

```swift
import XcodeKit
import Foundation

class LocalLLMCommand: NSObject, XCSourceEditorCommand {
    func perform(with invocation: XCSourceEditorCommandInvocation,
                 completionHandler: @escaping (Error?) -> Void) {
        guard let selection = invocation.buffer.selections.firstObject as? XCSourceTextRange else {
            completionHandler(nil)
            return
        }

        let selectedLines = (selection.start.line...selection.end.line)
            .compactMap { invocation.buffer.lines[$0] as? String }
            .joined()

        Task {
            do {
                let suggestion = try await OllamaClient.complete(prompt: selectedLines)
                // Insert suggestion after selection
                invocation.buffer.lines.insert(suggestion, at: selection.end.line + 1)
                completionHandler(nil)
            } catch {
                completionHandler(error)
            }
        }
    }
}
```

---

## Building iOS Apps with On-Device LLMs

Beyond using local LLMs as a developer tool, iOS 18 and Apple's on-device ML stack make it possible to ship LLM features directly in your app — running entirely on the iPhone or iPad.

### Apple Intelligence and On-Device Foundation Models (iOS 18+)

Apple's Apple Intelligence framework (available on A17 Pro and M-series devices) provides system-level LLM capabilities accessible to developers via:

- **Writing Tools** — System-provided text transformation, summarisation, and rewriting that your app can integrate via `UITextView` with no custom model needed.
- **Foundation Models framework** (announced WWDC 2025) — A Swift API that lets your app call Apple's on-device 3B parameter model directly for text generation and classification tasks.

```swift
import FoundationModels

let session = LanguageModelSession()

let response = try await session.respond(
    to: "Summarise the following meeting notes in three bullet points:\n\(notesText)"
)

print(response.content)
```

This approach requires no model bundling, no API keys, and runs entirely on-device — ideal for features like note summarisation, smart reply suggestions, or content classification.

### Bundling a Custom Model with Core ML

For use cases that require a specific capability not covered by Apple Intelligence — domain-specific classification, custom instruction tuning, or support for older devices — you can convert and bundle your own model using Core ML.

**Convert a model to Core ML format:**

```bash
# Install coremltools
pip install coremltools transformers

# Convert a HuggingFace model to Core ML
python3 << 'EOF'
import coremltools as ct
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model_id = "microsoft/phi-2"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float16)

# Trace with example inputs matching the model's expected shape
example_input_ids = torch.zeros((1, 64), dtype=torch.long)
traced = torch.jit.trace(model, (example_input_ids,))
mlmodel = ct.convert(traced, compute_units=ct.ComputeUnit.ALL)
mlmodel.save("Phi2.mlpackage")
EOF
```

Add the `.mlpackage` to your Xcode project and load it:

```swift
import CoreML

guard let modelURL = Bundle.main.url(forResource: "Phi2", withExtension: "mlpackage"),
      let model = try? MLModel(contentsOf: modelURL) else {
    return
}

// Run inference via the generated model class
let input = Phi2Input(inputIds: tokenIds)
let output = try model.prediction(from: input)
```

### Using Swift Transformers (llm.swift)

The [swift-transformers](https://github.com/huggingface/swift-transformers) package from Hugging Face provides a high-level Swift API for running transformer models on Apple devices using Metal Performance Shaders:

```swift
// Package.swift dependency
.package(url: "https://github.com/huggingface/swift-transformers", from: "0.1.12")
```

```swift
import Transformers

let pipeline = try await TextGenerationPipeline(
    model: "distilgpt2",
    tokenizer: "distilgpt2"
)

let result = try await pipeline.generate(
    text: "The best way to learn Swift is",
    maxNewTokens: 100
)

print(result)
```

This library handles model download, tokenisation, and batched generation on the device's GPU/Neural Engine.

---

## Performance Considerations for On-Device Inference

Running LLMs on iPhone and iPad hardware is feasible but requires careful management:

| Factor | Guidance |
|---|---|
| **Model size** | 1B–3B parameter models are practical; 7B models are possible on M-series iPads but slow on A-series iPhones |
| **Quantisation** | Use 4-bit quantisation (Q4) to reduce memory by ~70% with minimal quality loss |
| **Thermal management** | Monitor `ProcessInfo.thermalState` and pause inference if the device enters `.serious` or `.critical` state |
| **Memory pressure** | Subscribe to `UIApplication.didReceiveMemoryWarningNotification` and release model resources if needed |
| **Background inference** | Keep generation sessions short; avoid running inference in background tasks where iOS may terminate the process |

```swift
// Monitor thermal state before inference
let thermalState = ProcessInfo.processInfo.thermalState
guard thermalState == .nominal || thermalState == .fair else {
    // Defer inference or fall back to cloud
    return
}
```

---

## Local vs. Cloud LLMs: When to Use Each

| Scenario | Local LLM | Cloud LLM |
|---|---|---|
| Confidential source code | ✅ Preferred | ⚠️ Review data policy |
| Complex architectural reasoning | ⚠️ Limited | ✅ Preferred |
| Offline / air-gapped development | ✅ Only option | ✗ Not available |
| Continuous inline completions | ✅ No cost ceiling | ⚠️ Token costs accumulate |
| App features on older devices | ⚠️ Limited model size | ✅ Full capability via API |
| Regulated data (health, finance) | ✅ Data never leaves device | ⚠️ Compliance review needed |
| Latest model quality | ⚠️ Smaller models | ✅ Frontier models |

A common pattern is a **local-first fallback**: attempt inference on-device and, if the query is too complex or the device is thermally constrained, fall back to a cloud API with the user's explicit consent.

---

## Getting Started Checklist

1. **Install Ollama** with `brew install ollama` and pull `codellama:13b` or `llama3.2:3b`.
2. **Connect Continue.dev** in VS Code to your local Ollama server and experiment with chat-assisted Swift refactoring.
3. **Evaluate Apple Intelligence APIs** (iOS 18+, A17 Pro / M-series) for built-in summarisation and generation — no bundled model required.
4. **Prototype with swift-transformers** to understand the UX of on-device generation: latency, thermal behaviour, and user-facing progress indicators.
5. **Benchmark on your target device class** — latency acceptable on an M4 iPad Pro may be unusable on an iPhone 14.
6. **Design graceful fallbacks** — on-device inference should degrade gracefully to a cloud API or a simplified rule-based path, never a hard failure.

---

## Conclusion

Local LLMs have crossed the threshold of practical usefulness for iOS development. On the developer tooling side, running CodeLlama or Mistral on your Mac gives you a private, cost-free coding assistant that integrates with Xcode and VS Code through tools like Ollama and Continue.dev. On the product side, Apple Intelligence APIs and Core ML provide the infrastructure to ship on-device language model features to users without the complexity of cloud infrastructure.

The models available locally today are not yet equal to frontier cloud models for every task — but for Swift code generation, documentation, test authoring, and lightweight in-app intelligence, they are more than capable. As model efficiency continues to improve with each generation of Apple Silicon, the gap will narrow further.

Ready to integrate local AI capabilities into your iOS development workflow or ship on-device AI features to your users? [Get in touch with the Skillfield team](/#contact).
