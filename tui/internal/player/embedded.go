package player

// Embedded player using libmpv CGo (Mode B).
// This is a placeholder for future implementation.
//
// To build with embedded support:
//   1. Install libmpv-dev (dev headers + .so)
//   2. Build with: CGO_ENABLED=1 go build -tags embedded
//
// The embedded player renders video frames directly into the
// terminal using kitty graphics protocol or sixel. It calls
// libmpv's render API via CGo bindings to get raw RGBA frames,
// then pushes them to the terminal at full video frame rate.
//
// TODO:
//   - Add build tag: //go:build embedded
//   - Implement libmpv handle creation and config
//   - Implement render callback and frame loop
//   - Implement kitty graphics protocol (base64 RGBA → escape codes)
//   - Implement sixel encoder fallback
//   - Handle audio via libmpv audio output
//   - IPC for pause/seek/position queries
//   - Window resize handling
