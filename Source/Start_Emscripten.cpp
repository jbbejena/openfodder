/*
 *  Open Fodder
 *  ---------------
 *
 *  Copyright (C) 2008-2026 Open Fodder
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 */

#ifdef EMSCRIPTEN
#include "stdafx.hpp"
#include "WebInput.hpp"
#include "Utils/json.hpp"

namespace {
using Json = nlohmann::json;
const std::string demoCampaign = "Amiga Format Christmas Special";
int requestedAction = 0, requestedMission = 0, attempt = 0;
Json result = nullptr;

void stage(WebInput::Stage value, const char* name) {
    WebInput::SetStage(value);
    EM_ASM({ Module.onGameStatus && Module.onGameStatus(UTF8ToString($0), $1); },
        name, g_Fodder->mStartParams->mCheatsEnabled);
}

bool hasNextPhase() {
    const auto& data = g_Fodder->mGame_Data;
    return data.mMission_Current && (data.mMission_Phase < data.mMission_Current->NumberOfPhases() ||
        g_Fodder->mGame_Data.mCampaign.getMission(data.mMission_Number + 1));
}

void menu() {
    auto& e = *g_Fodder;
    e.mInterruptCallback = nullptr;
    e.mInput_Enabled = e.mPhase_In_Progress = false;
    e.Phase_EngineReset();
    e.Phase_SquadPrepare();
    e.GameData_Reset();
    e.VersionSwitch(e.mVersions->GetForCampaign(demoCampaign));
    // Only the loaded/pinned demo is supported by this standalone content set.
    if (!e.mGame_Data.mCampaign.LoadCampaign(demoCampaign, false))
        throw std::runtime_error("Could not load the Christmas Special campaign");
    result = nullptr;
    stage(WebInput::Stage::Menu, "menu");
}

void chooseMission(int number) {
    auto& e = *g_Fodder;
    e.mInput_Enabled = e.mPhase_In_Progress = false;
    e.mParams->mMissionNumber = number;
    e.mParams->mPhaseNumber = 1;
    if (!e.mGame_Data.mCampaign.LoadCampaign(demoCampaign, false) || !e.mGame_Data.mCampaign.getMission(number))
        throw std::runtime_error("The selected demo mission is unavailable");
    e.Game_Setup();
    result = nullptr;
}

void deploy() {
    auto& e = *g_Fodder;
    e.Phase_EngineReset();
    e.Phase_SquadPrepare();
    e.mMission_EngineTicks = 0;
    e.Phase_Prepare();
    ++attempt;
    result = nullptr;
    stage(WebInput::Stage::Battlefield, "battlefield");
}

void finish(int phaseResult) {
    auto& e = *g_Fodder;
    // Abort wins precedence even if objectives finish in the same engine tick.
    const char* outcome = e.mPhase_Aborted ? "aborted" :
        phaseResult == 0 && e.mPhase_Complete && !e.mPhase_TryAgain ? "won" : e.mPhase_TryAgain ? "lost" : "ended";
    result = {{"outcome", outcome}, {"attempt", attempt}, {"engineTick", e.mMission_EngineTicks},
        {"mission", e.mGame_Data.mMission_Number}, {"phase", e.mGame_Data.mMission_Phase},
        {"map", e.mGame_Data.mPhase_Current->mMapFilename}, {"cheats", e.mStartParams->mCheatsEnabled}};
    e.mInput_Enabled = e.mPhase_In_Progress = false;
    stage(WebInput::Stage::Result, "result");
}

void web_loop() {
    auto& e = *g_Fodder;
    // The command adapter only queues intent. Transitions/scene preparation run
    // after its iteration and the redraw mutex, never from inside that queue.
    e.Interrupt_Sim_Tick();
    const int action = requestedAction, number = requestedMission;
    requestedAction = requestedMission = 0;
    switch (action) {
    case WebInput::SelectMission:
        chooseMission(number);
        stage(WebInput::Stage::Briefing, "briefing");
        break;
    case WebInput::DeployMission: deploy(); break;
    case WebInput::RetryMission:
        // A fresh native mission start, not revival or a persistent checkpoint.
        chooseMission(e.mGame_Data.mMission_Number);
        deploy();
        break;
    case WebInput::AbortMission:
        e.mPhase_Aborted = e.mPhase_EscapeKeyAbort = true;
        break;
    case WebInput::ReturnToMenu: menu(); break;
    case WebInput::ContinueMission:
        if (e.mGame_Data.Phase_Next()) {
            result = nullptr;
            stage(WebInput::Stage::Briefing, "briefing");
        }
        break;
    }
    const auto current = WebInput::GetStage();
    if (current == WebInput::Stage::Battlefield || current == WebInput::Stage::Ending) {
        if (current == WebInput::Stage::Battlefield && (e.mPhase_Aborted || e.mPhase_Complete || e.mPhase_TryAgain)) {
            // Keep the native end countdown/cleanup, with commands gated and
            // presentation/user pause released because this attempt has ended.
            e.mInput_Enabled = false;
            stage(WebInput::Stage::Ending, "ending");
        }
        if (!e.mPhase_Paused) {
            const int phaseResult = e.Phase_Cycle();
            if (phaseResult != 1) finish(phaseResult);
        }
    }
    e.Video_Sleep();
    Sleep(10); // Preserve the existing browser loop's pacing.
}
}

namespace WebInput {
int ValidateMission(int action, int a, int b) {
    if (requestedAction) return -7; // busy
    if (b || (action != SelectMission && a)) return -1; // invalid
    const auto current = GetStage();
    auto& e = *g_Fodder;
    switch (action) {
    case SelectMission:
        if (current != Stage::Menu) return -6;
        return a > 0 && e.mGame_Data.mCampaign.getMission(a) ? 0 : -1;
    case DeployMission: return current == Stage::Briefing ? 0 : -6;
    case RetryMission: return current == Stage::Result ? 0 : -6;
    case AbortMission:
        return current == Stage::Battlefield && !e.mPhase_Aborted && !e.mPhase_Complete && !e.mPhase_TryAgain ? 0 : -6;
    case ReturnToMenu: return current == Stage::Briefing || current == Stage::Result ? 0 : -6;
    case ContinueMission:
        return current == Stage::Result && result["outcome"] == "won" && hasNextPhase() ? 0 : -6;
    default: return -1;
    }
}
void RequestMission(int action, int a) { requestedAction = action; requestedMission = a; }
std::string MissionState() {
    const auto& data = g_Fodder->mGame_Data;
    const auto current = GetStage();
    Json state = {{"campaign", demoCampaign}, {"attempt", attempt}, {"pending", requestedAction != 0},
        {"result", result}, {"canContinue", current == Stage::Result && result["outcome"] == "won" && hasNextPhase()}};
    state["missions"] = Json::array();
    int number = 0;
    for (const auto& mission : g_Fodder->mGame_Data.mCampaign.getMissions())
        state["missions"].push_back({{"number", ++number}, {"name", mission->mName}});
    if (current != Stage::Menu && data.mMission_Current && data.mPhase_Current) {
        state["number"] = data.mMission_Number;
        state["phase"] = data.mMission_Phase;
        state["name"] = data.mMission_Current->mName;
        state["phaseName"] = data.mPhase_Current->mName;
        state["map"] = data.mPhase_Current->mMapFilename;
        state["objectives"] = Json::array();
        for (const auto goal : data.mPhase_Current->mGoals)
            if (goal > 0 && static_cast<size_t>(goal) <= mMissionGoal_Titles.size())
                state["objectives"].push_back(mMissionGoal_Titles[goal - 1]);
    }
    return state.dump();
}
}

int start(int argc, char *argv[]) {

	g_Debugger = std::make_shared<cDebugger>();
	g_Window = std::make_shared<cWindow>();
	g_ResourceMan = std::make_shared<cResourceMan>();
	g_Fodder = std::make_shared<cFodder>(g_Window);

	auto Params = std::make_shared<sFodderParameters>();
	Params->Process(argc, argv);

	if (Params->mShowHelp)
		return 0;

	// The shell passes --cheats only after explicit diagnostic opt-in.
	// Never override the normal-play default from the controlled web ini.
	EM_ASM({ Module.onGameStatus && Module.onGameStatus('starting', $0); }, Params->mCheatsEnabled);
	Params->mMouseAlternative = true;
	g_Fodder->Prepare(Params);
	EM_ASM({
		Module.renderer = UTF8ToString($0);
		Module.print('SDL renderer: ' + Module.renderer);
	}, SDL_GetRendererName(g_Window->GetRenderer()));
	g_Fodder->Phase_SquadPrepare();

	menu();
	emscripten_set_main_loop(web_loop, 0, true);

	//g_Fodder->Service_Show();
	return 0;
}

#endif
