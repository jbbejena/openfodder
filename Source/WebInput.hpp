/* Open Fodder browser command adapter. GPL-3.0-or-later; see COPYING. */
#pragma once

#ifdef EMSCRIPTEN
class cFodder;
namespace WebInput {
    enum class Stage { Uninitialized, Menu, Battlefield };
    void SetStage(Stage stage);
    void ApplyPending(cFodder& engine);
    bool OwnsCamera();
    bool OwnsInput();
    void Fire(cFodder& engine);
}
#endif
