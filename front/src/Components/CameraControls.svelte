<script lang="typescript">
    import { requestedScreenSharingState, screenSharingAvailableStore } from "../Stores/ScreenSharingStore";
    import { isSilentStore, requestedCameraState, requestedMicrophoneState } from "../Stores/MediaStore";
    import monitorImg from "./images/monitor.svg";
    import monitorCloseImg from "./images/monitor-close.svg";
    import cinemaImg from "./images/cinema.svg";
    import cinemaCloseImg from "./images/cinema-close.svg";
    import microphoneImg from "./images/microphone.svg";
    import microphoneCloseImg from "./images/microphone-close.svg";
    import layoutPresentationImg from "./images/layout-presentation.svg";
    import layoutChatImg from "./images/layout-chat.svg";
    import { LayoutMode } from "../WebRtc/LayoutManager";
    import { peerStore } from "../Stores/PeerStore";
    import { onDestroy } from "svelte";
    import { embedScreenLayout } from "../Stores/EmbedScreensStore";

    function screenSharingClick(): void {
        if (isSilent) return;
        if ($requestedScreenSharingState === true) {
            requestedScreenSharingState.disableScreenSharing();
        } else {
            requestedScreenSharingState.enableScreenSharing();
        }
    }

    function cameraClick(): void {
        if (isSilent) return;
        if ($requestedCameraState === true) {
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    }

    function microphoneClick(): void {
        if (isSilent) return;
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    }

    function switchLayoutMode() {
        if ($embedScreenLayout === LayoutMode.Presentation) {
            $embedScreenLayout = LayoutMode.VideoChat;
        } else {
            $embedScreenLayout = LayoutMode.Presentation;
        }
    }

    let isSilent: boolean;
    const unsubscribeIsSilent = isSilentStore.subscribe((value) => {
        isSilent = value;
    });
    onDestroy(unsubscribeIsSilent);
</script>

<div class="btn-cam-action">
    <div class="btn-layout" on:click={switchLayoutMode} class:hide={$peerStore.size === 0}>
        {#if $embedScreenLayout === LayoutMode.Presentation}
            <img src={layoutPresentationImg} style="padding: 2px" alt="Switch to mosaic mode" />
        {:else}
            <img src={layoutChatImg} style="padding: 2px" alt="Switch to presentation mode" />
        {/if}
    </div>
    <div
        class="btn-monitor"
        on:click={screenSharingClick}
        class:hide={!$screenSharingAvailableStore || isSilent}
        class:enabled={$requestedScreenSharingState}
    >
        {#if $requestedScreenSharingState && !isSilent}
            <img src={monitorImg} alt="Start screen sharing" />
        {:else}
            <img src={monitorCloseImg} alt="Stop screen sharing" />
        {/if}
    </div>
    <div class="btn-video" on:click={cameraClick} class:disabled={!$requestedCameraState || isSilent}>
        {#if $requestedCameraState && !isSilent}
            <img src={cinemaImg} alt="Turn on webcam" />
        {:else}
            <img src={cinemaCloseImg} alt="Turn off webcam" />
        {/if}
    </div>
    <div class="btn-micro" on:click={microphoneClick} class:disabled={!$requestedMicrophoneState || isSilent}>
        {#if $requestedMicrophoneState && !isSilent}
            <img src={microphoneImg} alt="Turn on microphone" />
        {:else}
            <img src={microphoneCloseImg} alt="Turn off microphone" />
        {/if}
    </div>
</div>
