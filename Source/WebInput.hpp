/* Open Fodder browser command adapter. GPL-3.0-or-later; see COPYING. */
#pragma once

#ifdef EMSCRIPTEN
#include <string>
class cFodder;
namespace WebInput {
    enum class Stage { Uninitialized, Menu, Briefing, Battlefield, Ending, Result };
    // Additive action numbers; the existing combat API (0..10) stays stable.
    enum MissionAction { SelectMission = 11, DeployMission, RetryMission, AbortMission, ReturnToMenu, ContinueMission, ResumeCheckpoint };
    void SetStage(Stage stage);
    Stage GetStage();
    int ValidateMission(int action, int a, int b);
    void RequestMission(int action, int a);
    std::string MissionState();
    void ApplyPending(cFodder& engine);
    bool OwnsCamera();
    bool OwnsInput();
    void Fire(cFodder& engine);
}
#endif
