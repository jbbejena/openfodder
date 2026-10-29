/* Optional browser measurements. GPL-3.0-or-later; see COPYING. */
#pragma once
#ifdef EMSCRIPTEN
namespace WebPerformance {
    void Observe();
    void Break();
    void Presented(bool success);
}
#endif
