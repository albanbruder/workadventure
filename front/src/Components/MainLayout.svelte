<script lang="typescript">
    import { audioManagerVisibilityStore } from "../Stores/AudioManagerStore";

    import { hasEmbedScreen } from "../Stores/EmbedScreensStore";
    import { emoteMenuStore } from "../Stores/EmoteStore";
    import { gameOverlayVisibilityStore } from "../Stores/GameOverlayStoreVisibility";
    import { requestVisitCardsStore } from "../Stores/GameStore";
    import { helpCameraSettingsVisibleStore } from "../Stores/HelpCameraSettingsStore";
    import { layoutManagerActionVisibilityStore } from "../Stores/LayoutManagerStore";
    import { menuIconVisiblilityStore, menuVisiblilityStore, warningContainerStore } from "../Stores/MenuStore";
    import { showReportScreenStore, userReportEmpty } from "../Stores/ShowReportScreenStore";
    import { banMessageVisibleStore } from "../Stores/TypeMessageStore/BanMessageStore";
    import { textMessageVisibleStore } from "../Stores/TypeMessageStore/TextMessageStore";
    import AudioManager from "./AudioManager/AudioManager.svelte";
    import CameraControls from "./CameraControls.svelte";
    import EmbedScreensContainer from "./EmbedScreens/EmbedScreensContainer.svelte";
    import EmoteMenu from "./EmoteMenu/EmoteMenu.svelte";
    import HelpCameraSettingsPopup from "./HelpCameraSettings/HelpCameraSettingsPopup.svelte";
    import LayoutActionManager from "./LayoutActionManager/LayoutActionManager.svelte";
    import Menu from "./Menu/Menu.svelte";
    import MenuIcon from "./Menu/MenuIcon.svelte";
    import MyCamera from "./MyCamera.svelte";
    import ReportMenu from "./ReportMenu/ReportMenu.svelte";
    import AdminMessage from "./TypeMessage/BanMessage.svelte";
    import TextMessage from "./TypeMessage/TextMessage.svelte";
    import VisitCard from "./VisitCard/VisitCard.svelte";
    import WarningContainer from "./WarningContainer/WarningContainer.svelte";
</script>

<div id="main-layout">
    <aside id="main-layout-left-aside">
        {#if $menuIconVisiblilityStore}
            <MenuIcon />
        {/if}
    </aside>

    <section id="main-layout-main">
        {#if $menuVisiblilityStore}
            <Menu />
        {/if}

        {#if $banMessageVisibleStore}
            <AdminMessage />
        {/if}

        {#if $showReportScreenStore !== userReportEmpty}
            <ReportMenu />
        {/if}

        {#if $warningContainerStore}
            <WarningContainer />
        {/if}

        {#if $helpCameraSettingsVisibleStore}
            <HelpCameraSettingsPopup />
        {/if}

        {#if $textMessageVisibleStore}
            <TextMessage />
        {/if}

        {#if $audioManagerVisibilityStore}
            <AudioManager />
        {/if}

        {#if $requestVisitCardsStore}
            <VisitCard visitCardUrl={$requestVisitCardsStore} />
        {/if}

        {#if $emoteMenuStore}
            <EmoteMenu />
        {/if}

        {#if hasEmbedScreen}
            <EmbedScreensContainer />
        {/if}
    </section>

    <section id="main-layout-baseline">
        {#if $layoutManagerActionVisibilityStore}
            <LayoutActionManager />
        {/if}

        {#if $gameOverlayVisibilityStore}
            <MyCamera />
            <CameraControls />
        {/if}
    </section>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    #main-layout {
        display: grid;
        grid-template-columns: 7% 93%;
        grid-template-rows: 80% 20%;

        &-left-aside {
            min-width: 80px;
        }

        &-baseline {
            grid-column: 1/3;
        }
    }

    @include media-breakpoint-up(md) {
        #main-layout {
            grid-template-columns: 15% 85%;

            &-left-aside {
                min-width: auto;
            }
        }
    }

    @include media-breakpoint-up(sm) {
        #main-layout {
            grid-template-columns: 20% 80%;
        }
    }
</style>
