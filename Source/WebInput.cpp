/* Open Fodder browser command adapter. GPL-3.0-or-later; see COPYING. */
#ifdef EMSCRIPTEN
#include "stdafx.hpp"
#include "WebInput.hpp"
#include "Utils/json.hpp"

namespace {
using Json = nlohmann::json;
enum Action { Cancel, SelectSquad, Move, FireStart, FireAim, FireStop, SelectWeapon, Pan, Follow, Pause, Secondary };
enum Result { Ok = 0, Invalid = -1, Uninitialized = -2, NotBattlefield = -3,
              Paused = -4, NoSquad = -5, Unavailable = -6, Busy = -7, Unsupported = -8 };
struct Command { int action, a, b, id; };
std::vector<Command> pending;
WebInput::Stage stage = WebInput::Stage::Uninitialized;
int nextId = 0, lastId = 0, lastResult = Ok;
int pauseReasons = 0;
int lifecycleReasons = 0; // 2 hidden, 4 unfocused, 16 awaiting explicit return
bool lastPaused = false, fireHeld = false, manualCamera = false, ownsInput = false;
bool secondaryPending = false;
int secondarySquad = -1, secondaryWeapon = eWeapon_None;
sSprite* secondaryLeader = nullptr;
int fireX = 0, fireY = 0;

int BasePauseReasons(const cFodder& e) {
    int reasons = pauseReasons;
    if (e.mPhase_Paused != lastPaused) {
        if (e.mPhase_Paused) reasons |= 1;
        else reasons &= ~1;
    }
    return reasons;
}
int CurrentPauseReasons(const cFodder& e) { return BasePauseReasons(e) | lifecycleReasons; }

bool Battlefield(const cFodder& e) {
    return stage == WebInput::Stage::Battlefield && e.mPhase_In_Progress &&
        !e.mPhase_Finished && !e.mPhase_Aborted && !e.mPhase_Complete && !e.mPhase_TryAgain &&
        !e.mPhase_ShowMapOverview && !e.mGame_Data.mGamePhase_Data.mIsComplete;
}
bool Selected(const cFodder& e) {
    return e.mSquad_Selected >= 0 && e.mSquad_Selected < 3 &&
        e.mSquads_TroopCount[e.mSquad_Selected] > 0 &&
        e.mSquad_Leader && e.mSquad_Leader != INVALID_SPRITE_PTR;
}
bool WorldPoint(const cFodder& e, int x, int y) {
    const int left = e.getMapVisibleOriginX() * 16, top = e.getMapVisibleOriginY() * 16;
    return x >= left && x < left + e.getMapVisibleWidthPixels() &&
        y >= top && y < top + e.getMapVisibleHeightPixels() && x < 32700 && y < 32700;
}
void Release(cFodder& e) {
    fireHeld = secondaryPending = false;
    e.mMouse_EventLastButtonsPressed = e.mMouseButtonStatus = 0;
    e.mButtonPressLeft = e.mButtonPressRight = 0;
    e.mMouse_Button_Left_Toggle = e.mMouse_Button_Right_Toggle = 0;
    e.mMouse_Button_LeftRight_Toggle = e.mMouse_Button_LeftRight_Toggle2 = false;
    e.mKeyControlPressed = 0;
    e.mSprite_Player_CheckWeapon = 0;
    for (auto& troop : e.mGame_Data.mSoldiers_Allocated) {
        if (troop.mSprite && troop.mSprite != INVALID_SPRITE_PTR && troop.mSprite->mWeaponFireTimer < 0)
            troop.mSprite->mWeaponFireTimer = 0;
    }
}
int Validate(const cFodder& e, int action, int a, int b) {
    if (action == Cancel || action == FireStop) return Ok;
    if (lifecycleReasons && action != Pause) return Paused;
    if (action >= WebInput::SelectMission) return WebInput::ValidateMission(action, a, b);
    if (!Battlefield(e)) return NotBattlefield;
    if (action == Pause) return (a == 0 || a == 1) && (b == 1 || b == 2 || b == 4 || b == 8) ? Ok : Invalid;
    if (CurrentPauseReasons(e)) return Paused;
    if (!e.mInput_Enabled || e.mCamera_Start_Adjust) return Busy;
    if (action == Pan) return std::abs(a) <= 128 && std::abs(b) <= 128 ? Ok : Invalid;
    if (action == Follow) return Ok;
    if (action == SelectSquad) {
        if (a < 0 || a > 2) return Invalid;
        return e.mSquads_TroopCount[a] > 0 ? Ok : Unavailable;
    }
    if (!Selected(e)) return NoSquad;
    if (action == SelectWeapon) {
        if (a != eWeapon_Grenade && a != eWeapon_Rocket) return Invalid;
        return (a == eWeapon_Grenade ? e.mSquad_Grenades[e.mSquad_Selected] : e.mSquad_Rockets[e.mSquad_Selected]) > 0 ? Ok : Unavailable;
    }
    if (action == Move || action == FireStart || action == FireAim || action == Secondary) {
        if (!WorldPoint(e, a, b)) return Invalid;
        // Vehicle-specific orders need their own contract; never silently issue
        // a different command to an embarked squad.
        if (e.mSquad_CurrentVehicle || e.mSquad_Leader->mInVehicle) return Unsupported;
        if (action == FireAim && !fireHeld) return Unavailable;
        if ((action == Secondary || action == FireStart) && secondaryPending) return Busy;
        if (action == Secondary) {
            const int weapon = e.mSquad_CurrentWeapon[e.mSquad_Selected];
            const int ammo = weapon == eWeapon_Grenade ? e.mSquad_Grenades[e.mSquad_Selected] :
                weapon == eWeapon_Rocket ? e.mSquad_Rockets[e.mSquad_Selected] : 0;
            if (ammo <= 0 || e.mSquad_Leader->mInWater) return Unavailable;
        }
        if (action == Move && e.mSquad_Walk_Target_Indexes[e.mSquad_Selected] >= 28) return Busy;
        return Ok;
    }
    return Invalid;
}
void MoveTo(cFodder& e, int x, int y) {
    Release(e);
    manualCamera = false;
    for (auto& troop : e.mGame_Data.mSoldiers_Allocated) {
        auto sprite = troop.mSprite;
        if (!sprite || sprite == INVALID_SPRITE_PTR || sprite->field_32 != e.mSquad_Selected) continue;
        sprite->mVehicleWalkTarget = nullptr;
        sprite->field_44 = sprite->mPosXFrac = sprite->mPosYFrac = 0;
    }
    e.mCamera_PanTargetX = x;
    e.mCamera_PanTargetY = y;
    e.mMouse_Locked = false;
    e.Squad_Walk_Target_Set(x, y, e.mSquad_Selected, e.mSquad_Leader->mPosX);
    for (auto& joining : e.mSquad_Join_TargetSquad)
        if (joining == e.mSquad_Selected) joining = -1;
}
void PanBy(cFodder& e, int dx, int dy) {
    Release(e);
    manualCamera = true;
    const int minX = e.getMapVisibleOriginX() * 16, minY = e.getMapVisibleOriginY() * 16;
    const int maxX = std::max(minX, minX + e.getMapVisibleWidthPixels() - e.getCameraWidth());
    const int maxY = std::max(minY, minY + e.getMapVisibleHeightPixels() - e.getCameraHeight());
    const int oldX = e.mCameraX >> 16, oldY = e.mCameraY >> 16;
    const int x = std::max(minX, std::min(maxX, oldX + dx));
    const int y = std::max(minY, std::min(maxY, oldY + dy));
    e.mCamera_Speed_X = x * 65536 - e.mCameraX;
    e.mCamera_Speed_Y = y * 65536 - e.mCameraY;
    e.Camera_TileSpeedX_Set();
    e.MapTile_UpdateFromCamera();
    e.MapTile_Update_Position();
}
}

namespace WebInput {
Stage GetStage() { return stage; }
void SetStage(Stage value) {
    pending.clear();
    if (g_Fodder) Release(*g_Fodder);
    stage = value;
    pauseReasons = 0;
    fireHeld = manualCamera = ownsInput = false;
    lastPaused = lifecycleReasons != 0;
    if (g_Fodder) g_Fodder->mPhase_Paused = lastPaused;
}
bool LifecyclePaused() { return lifecycleReasons != 0; }
void ApplyPending(cFodder& e) {
    ownsInput = false;
    // Native projectile creation (including a rejected shot) consumes this
    // latch. Never re-arm it on a later input interrupt: one request, one shot.
    if (secondaryPending && (!e.mMouse_Button_LeftRight_Toggle || !Selected(e) ||
        e.mSquad_Selected != secondarySquad || e.mSquad_Leader != secondaryLeader ||
        e.mSquad_CurrentWeapon[secondarySquad] != secondaryWeapon)) Release(e);
    // Preserve desktop P as the user pause reason. External reasons cannot be
    // cleared by a keyboard toggle or by releasing a different reason.
    pauseReasons = BasePauseReasons(e);
    if (pauseReasons && !lastPaused) { Release(e); manualCamera = false; }
    for (const auto& command : pending) {
        lastId = command.id;
        lastResult = Validate(e, command.action, command.a, command.b);
        if (lastResult != Ok) continue;
        ownsInput = true;
        if (command.action >= SelectMission) {
            Release(e);
            RequestMission(command.action, command.a);
            continue;
        }
        switch (command.action) {
        case Cancel: Release(e); manualCamera = false; break;
        case FireStop: Release(e); break;
        case SelectSquad: Release(e); manualCamera = false; e.Squad_Select(command.a, false); break;
        case Move: MoveTo(e, command.a, command.b); break;
        case FireStart:
            if (!fireHeld) {
                Release(e);
                e.mSquad_Member_Fire_CoolDown_Override = true;
            }
            fireHeld = true;
            fireX = command.a; fireY = command.b;
            break;
        case FireAim: fireX = command.a; fireY = command.b; break;
        case Secondary:
            Release(e);
            secondaryPending = true;
            secondarySquad = e.mSquad_Selected;
            secondaryWeapon = e.mSquad_CurrentWeapon[secondarySquad];
            secondaryLeader = e.mSquad_Leader;
            fireX = command.a; fireY = command.b;
            e.mMouse_Button_LeftRight_Toggle = true;
            break;
        case SelectWeapon:
            Release(e);
            if (command.a == eWeapon_Grenade) e.Squad_Select_Grenades();
            else e.Squad_Select_Rockets();
            break;
        case Pan: PanBy(e, command.a, command.b); break;
        case Follow: Release(e); manualCamera = false; e.mCamera_Start_Adjust = true; break;
        case Pause:
            if (command.a) { pauseReasons |= command.b; Release(e); manualCamera = false; }
            else pauseReasons &= ~command.b;
            break;
        }
        e.mPhase_Paused = (pauseReasons | lifecycleReasons) != 0;
    }
    pending.clear();
    e.mPhase_Paused = (pauseReasons | lifecycleReasons) != 0;
    lastPaused = e.mPhase_Paused;
    if (!Battlefield(e) || !e.mInput_Enabled || e.mPhase_Paused || !Selected(e)) {
        if (fireHeld || secondaryPending) Release(e);
        if (!Battlefield(e)) manualCamera = false;
    }
    if (fireHeld || secondaryPending) ownsInput = true;
}
bool OwnsCamera() { return manualCamera; }
bool OwnsInput() { return ownsInput; }
void Fire(cFodder& e) {
    if ((!fireHeld && !secondaryPending) || !Selected(e) || e.mPhase_Paused || !Battlefield(e)) return;
    // The public API uses map pixels. Only this adapter compensates for the
    // original target routine's legacy cursor hotspot; JS never repeats it.
    e.mMouseX = fireX - (e.mCameraX >> 16) + 16;
    e.mMouseY = fireY - (e.mCameraY >> 16) + 8;
    e.mMouseButtonStatus = 2;
    // Mouse_ReadInputs has already sampled SDL. Do not manufacture a new
    // right-button edge every frame, which would reset the native fire cooldown.
    e.mButtonPressRight = -1;
    e.mButtonPressLeft = 0;
    e.mMouse_Button_Right_Toggle = 1;
    // For secondary fire the original troop/weapon path owns and consumes the
    // left+right latch. Do not clear it here or create/decrement ammo in JS.
    if (!secondaryPending) e.mMouse_Button_LeftRight_Toggle = false;
    e.mMouse_Button_LeftRight_Toggle2 = false;
    e.Squad_Member_Target_Set();
}
}

extern "C" {
// Lifecycle events can be the last callback before the browser freezes. Apply
// this small safety boundary synchronously instead of waiting for another frame.
EMSCRIPTEN_KEEPALIVE int of_web_lifecycle(double rawReasons) {
    if (!std::isfinite(rawReasons) || rawReasons != std::floor(rawReasons) || rawReasons < 0 || rawReasons > 22) return Invalid;
    const int reasons = static_cast<int>(rawReasons);
    if (reasons & ~22) return Invalid;
    if (g_Fodder && stage != WebInput::Stage::Uninitialized) {
        auto& e = *g_Fodder;
        pauseReasons = BasePauseReasons(e);
        pending.erase(std::remove_if(pending.begin(), pending.end(), [](const Command& c) {
            return c.action != Pause && c.action < WebInput::SelectMission;
        }), pending.end());
        Release(e); manualCamera = false;
        e.mKeyCode = 0; e.mKeyCodeAscii = 0;
        e.mMouse_EventLastPositionRelative.Clear(); e.mMouse_EventLastWheel.Clear();
        // Drop stale native input events, keeping window/focus/quit events.
        for (Uint32 type : {SDL_EVENT_KEY_DOWN, SDL_EVENT_KEY_UP, SDL_EVENT_MOUSE_MOTION,
            SDL_EVENT_MOUSE_BUTTON_DOWN, SDL_EVENT_MOUSE_BUTTON_UP, SDL_EVENT_MOUSE_WHEEL,
            SDL_EVENT_FINGER_DOWN, SDL_EVENT_FINGER_UP, SDL_EVENT_FINGER_MOTION}) SDL_FlushEvent(type);
        e.mPhase_Paused = (pauseReasons | reasons) != 0;
        lastPaused = e.mPhase_Paused;
    }
    lifecycleReasons = reasons;
    return Ok;
}
EMSCRIPTEN_KEEPALIVE int of_web_command(int action, double a, double b) {
    if (action < Cancel || action > WebInput::ResumeCheckpoint || !std::isfinite(a) || !std::isfinite(b) ||
        a != std::floor(a) || b != std::floor(b) || std::abs(a) > 32700 || std::abs(b) > 32700) return Invalid;
    if (!g_Fodder || stage == WebInput::Stage::Uninitialized)
        return action == Cancel || action == FireStop ? Ok : Uninitialized;
    const int result = Validate(*g_Fodder, action, static_cast<int>(a), static_cast<int>(b));
    if (result != Ok) return result;
    // One transition per frame. Cancel/fire-stop cannot discard a mission
    // request and leave its caller waiting for an acknowledgement forever.
    if (action >= WebInput::SelectMission && std::any_of(pending.begin(), pending.end(),
        [](const Command& c) { return c.action >= WebInput::SelectMission; })) return Busy;
    const bool safety = action == Cancel || action == FireStop || action == Pause;
    if (safety) {
        pending.erase(std::remove_if(pending.begin(), pending.end(), [&](const Command& c) {
            if (action == Pause) return c.action == Pause && c.b == b;
            if (action == Cancel) return c.action != Pause && c.action < WebInput::SelectMission;
            return c.action == FireStart || c.action == FireAim || c.action == FireStop || c.action == Secondary;
        }), pending.end());
    }
    if (!safety && pending.size() >= 32) return Busy;
    pending.push_back({action, static_cast<int>(a), static_cast<int>(b), ++nextId});
    return nextId;
}
EMSCRIPTEN_KEEPALIVE const char* of_web_state() {
    static std::string output;
    Json state;
    state["api"] = 1;
    const char* names[] = {"uninitialized", "menu", "briefing", "battlefield", "ending", "result"};
    state["stage"] = names[static_cast<int>(stage)];
    state["last"] = {{"id", lastId}, {"code", lastResult}};
    state["pending"] = pending.size();
    state["lifecycleReasons"] = lifecycleReasons;
    state["ready"] = false;
    if (g_Fodder && stage != WebInput::Stage::Uninitialized)
        state["mission"] = Json::parse(WebInput::MissionState());
    // Mission-only fields are initialized by Game_Setup/Phase_Prepare, after
    // the campaign menu. Do not read them from the pre-mission snapshot.
    if (g_Fodder && stage == WebInput::Stage::Battlefield) {
        const auto& e = *g_Fodder;
        state["ready"] = Battlefield(e) && e.mInput_Enabled && !e.mCamera_Start_Adjust;
        state["pauseReasons"] = CurrentPauseReasons(e);
        state["paused"] = CurrentPauseReasons(e) != 0;
        state["fireHeld"] = fireHeld;
        state["secondaryPending"] = secondaryPending;
        state["manualCamera"] = manualCamera;
        state["engineTick"] = e.mMission_EngineTicks;
        state["selectedSquad"] = e.mSquad_Selected;
        state["view"] = {{"width", e.mWindow->GetScreenSize().getWidth()}, {"height", e.mWindow->GetScreenSize().getHeight()},
            {"sidebar", SIDEBAR_WIDTH}, {"cameraX", e.mCameraX >> 16}, {"cameraY", e.mCameraY >> 16}};
        state["squads"] = Json::array();
        if (stage == WebInput::Stage::Battlefield) {
            state["map"] = {{"left", e.getMapVisibleOriginX() * 16}, {"top", e.getMapVisibleOriginY() * 16},
                {"width", e.getMapVisibleWidthPixels()}, {"height", e.getMapVisibleHeightPixels()}};
            for (int i = 0; i < 3; ++i) {
                Json squad = {{"id", i}, {"count", e.mSquads_TroopCount[i]}, {"grenades", e.mSquad_Grenades[i]},
                    {"rockets", e.mSquad_Rockets[i]}, {"weapon", e.mSquad_CurrentWeapon[i]}};
                if (e.mSquads_TroopCount[i] > 0) {
                    const auto leader = i == e.mSquad_Selected ? e.mSquad_Leader : e.mSquads[i][0];
                    if (leader && leader != INVALID_SPRITE_PTR)
                        squad["leader"] = {{"x", leader->mPosX}, {"y", leader->mPosY}, {"targetX", leader->mTargetX},
                            {"targetY", leader->mTargetY}, {"aimX", leader->mWeaponTargetX}, {"aimY", leader->mWeaponTargetY}};
                }
                state["squads"].push_back(squad);
            }
        }
    }
    output = state.dump();
    return output.c_str();
}
}
#endif
