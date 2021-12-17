<script lang="ts">
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import microphoneCloseImg from "../images/microphone-close.svg";
    import reportImg from "./images/report.svg";
    import blockSignImg from "./images/blockSign.svg";
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import { getColorByString, srcObject } from "./utils";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    import Woka from "../Woka/Woka.svelte";

    export let peer: VideoPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;

    function openReport(peer: VideoPeer): void {
        showReportScreenStore.set({ userId: peer.userId, userName: peer.userName });
    }

    let embedScreen: EmbedScreen;

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    function noDrag() {
        return false;
    }
</script>

<div class="video-container">
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    <!-- {#if !$constraintStore || $constraintStore.video === false} -->
    <i
        class="container {!$constraintStore || $constraintStore.video === false ? '' : 'minimized'}"
        style="background-color: {getColorByString(name)};"
    >
        <span style="noselect">{peer.userName}</span>
        <div class="woka-icon"><Woka userId={peer.userId} placeholderSrc={""} /></div>
    </i>
    <!-- {/if} -->
    {#if $constraintStore && $constraintStore.audio === false}
        <img
            src={microphoneCloseImg}
            class="active noselect"
            draggable="false"
            on:dragstart|preventDefault={noDrag}
            alt="Muted"
        />
    {/if}
    <button class="report" on:click={() => openReport(peer)}>
        <img alt="Report this user" draggable="false" on:dragstart|preventDefault={noDrag} src={reportImg} />
        <span class="noselect">Report/Block</span>
    </button>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
        use:srcObject={$streamStore}
        autoplay
        playsinline
        on:click={() => highlightedEmbedScreen.toggleHighlight(embedScreen)}
    />
    <img src={blockSignImg} draggable="false" on:dragstart|preventDefault={noDrag} class="block-logo" alt="Block" />
    {#if $constraintStore && $constraintStore.audio !== false}
        <SoundMeterWidget stream={$streamStore} />
    {/if}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        padding-top: 15px;
    }

    .minimized {
        left: auto;
        transform: scale(0.5);
        opacity: 0.5;
    }

    .woka-icon {
        margin-right: 3px;
    }
</style>
