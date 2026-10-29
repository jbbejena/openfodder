/* Optional browser measurements. GPL-3.0-or-later; see COPYING. */
#ifdef EMSCRIPTEN
#include "stdafx.hpp"
#include "WebPerformance.hpp"
#include "WebInput.hpp"
#include "Utils/json.hpp"
#include <emscripten/heap.h>
#include <array>

namespace {
using Json = nlohmann::json;
bool recording = false;
double activeMs = 0, observedAt = -1, presentedAt = -1, intervalMs = 0;
double longestMs = 0;
unsigned frames = 0, failures = 0, intervals = 0;
std::array<unsigned, 1001> histogram{}; // Millisecond ceilings; last bin is >1000ms.

bool active() {
    if (!g_Fodder || WebInput::GetStage() != WebInput::Stage::Battlefield) return false;
    const auto& e = *g_Fodder;
    return e.mPhase_In_Progress && e.mInput_Enabled && !e.mPhase_Paused &&
        !WebInput::LifecyclePaused() && !e.mCamera_Start_Adjust &&
        !e.mPhase_Finished && !e.mPhase_Aborted && !e.mPhase_Complete && !e.mPhase_TryAgain &&
        !e.mPhase_ShowMapOverview && !e.mGame_Data.mGamePhase_Data.mIsComplete;
}
Json percentile(double fraction) {
    if (!intervals) return nullptr;
    const unsigned target = static_cast<unsigned>(std::ceil(intervals * fraction));
    unsigned count = 0;
    for (size_t i = 0; i < histogram.size(); ++i) {
        count += histogram[i];
        if (count >= target) return i == 1000 ? Json(nullptr) : Json(i + 1);
    }
    return nullptr;
}
}

namespace WebPerformance {
void Observe() {
    if (!recording) return;
    const double now = emscripten_get_now();
    if (active()) {
        if (observedAt >= 0) activeMs += now - observedAt;
        observedAt = now;
    } else {
        observedAt = presentedAt = -1;
    }
}
void Break() {
    if (!recording) return;
    Observe();
    observedAt = presentedAt = -1;
}
void Presented(bool success) {
    if (!recording) return;
    Observe();
    if (!active()) return;
    if (!success) { ++failures; return; }
    ++frames;
    const double now = emscripten_get_now();
    if (presentedAt >= 0) {
        const double delta = now - presentedAt;
        ++intervals; intervalMs += delta;
        longestMs = std::max(longestMs, delta);
        const size_t bin = delta > 1000 ? 1000 : std::max(0, static_cast<int>(std::ceil(delta)) - 1);
        ++histogram[bin];
    }
    presentedAt = now;
}
}

extern "C" {
// Read / reset-and-start / stop. This never changes pause, simulation or pacing.
EMSCRIPTEN_KEEPALIVE const char* of_web_performance(double operation) {
    static std::string output;
    if (!std::isfinite(operation) || operation < 0 || operation > 2 || operation != std::floor(operation)) {
        output = "{\"ok\":false,\"reason\":\"Invalid performance operation\"}";
        return output.c_str();
    }
    WebPerformance::Observe();
    if (operation == 1) {
        activeMs = intervalMs = longestMs = 0;
        observedAt = presentedAt = -1;
        frames = failures = intervals = 0; histogram.fill(0);
        recording = true;
    } else if (operation == 2) {
        recording = false;
        observedAt = presentedAt = -1;
    }
    const Json value = {{"ok", true}, {"version", 1}, {"recording", recording},
        {"active", recording && active()}, {"activeMs", activeMs},
        {"submittedFrames", frames}, {"failedSubmissions", failures}, {"intervals", intervals},
        {"intervalMs", intervalMs}, {"submittedFps", intervalMs > 0 ? Json(intervals * 1000.0 / intervalMs) : Json(nullptr)},
        {"submittedPerActiveSecond", activeMs > 0 ? Json(frames * 1000.0 / activeMs) : Json(nullptr)},
        {"p50MsUpperBound", percentile(.50)}, {"p95MsUpperBound", percentile(.95)},
        {"p99MsUpperBound", percentile(.99)}, {"maxMs", intervals ? Json(longestMs) : Json(nullptr)},
        {"over1000Ms", histogram.back()}, {"wasmCapacityBytes", emscripten_get_heap_size()}};
    output = value.dump();
    return output.c_str();
}
// Cheap RAF gate: no JSON serialization or mutation on animation callbacks.
EMSCRIPTEN_KEEPALIVE int of_web_performance_active() { return recording && active(); }
}
#endif
