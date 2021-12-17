<script lang="ts">
    import { highlightedEmbedScreen } from "../../../Stores/EmbedScreensStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import CoWebsitesContainer from "../CoWebsitesContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { coWebsiteManager } from "../../../WebRtc/CoWebsiteManager";
    import { afterUpdate } from "svelte";

    function closeCoWebsite() {
        if ($highlightedEmbedScreen?.type === "cowebsite") {
            coWebsiteManager.closeCoWebsite($highlightedEmbedScreen.embed);
        }
    }

    function minimiseCoWebsite() {
        if ($highlightedEmbedScreen?.type === "cowebsite") {
            highlightedEmbedScreen.removeHighlight();
            coWebsiteManager.resizeAllIframes();
        }
    }

    function expandCoWebsite() {
        if ($highlightedEmbedScreen?.type === "cowebsite") {
            coWebsiteManager.goToMain($highlightedEmbedScreen.embed);
        }
    }

    afterUpdate(() => {
        if ($highlightedEmbedScreen) {
            coWebsiteManager.resizeAllIframes();
        }
    });
</script>

<div id="embed-left-block">
    <div id="main-embed-screen">
        {#if $highlightedEmbedScreen}
            {#if $highlightedEmbedScreen.type === "streamable"}
                {#key $highlightedEmbedScreen.embed.uniqueId}
                    <MediaBox isHightlighted={true} streamable={$highlightedEmbedScreen.embed} />
                {/key}
            {:else if $highlightedEmbedScreen.type === "cowebsite"}
                {#key $highlightedEmbedScreen.embed.iframe.id}
                    <div
                        id={"cowebsite-slot-" + $highlightedEmbedScreen.embed.iframe.id}
                        class="highlighted-cowebsite nes-container is-rounded"
                    >
                        <div class="actions">
                            <button type="button" class="nes-btn is-primary expand" on:click={expandCoWebsite}>></button
                            >
                            <button type="button" class="nes-btn is-primary minimise" on:click={minimiseCoWebsite}
                                >=</button
                            >
                            <button type="button" class="nes-btn is-error close" on:click={closeCoWebsite}
                                >&times;</button
                            >
                        </div>
                    </div>
                {/key}
            {/if}
        {/if}
    </div>

    <CoWebsitesContainer />
</div>

<CamerasContainer highlightedEmbedScreen={$highlightedEmbedScreen} />

<style lang="scss">
    #embed-left-block {
        display: flex;
        flex-direction: column;
        flex: 0 0 75%;
        height: 100%;
        width: 75%;
    }
    #main-embed-screen {
        height: 70%;
        margin-bottom: 5%;

        .highlighted-cowebsite {
            height: 100%;
            background-color: rgba(#000000, 0.6);

            .actions {
                z-index: 200;
                position: relative;
                display: flex;
                flex-direction: row;
                justify-content: end;
                gap: 2%;
                pointer-events: all;
            }
        }
    }
</style>
