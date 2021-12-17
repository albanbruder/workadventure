<script lang="typescript">
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";

    export let highlightedEmbedScreen: EmbedScreen | null;
</script>

<aside id="cameras-container">
    {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
        {#if !highlightedEmbedScreen || highlightedEmbedScreen.type !== "streamable" || (highlightedEmbedScreen.type === "streamable" && highlightedEmbedScreen.embed !== peer)}
            <MediaBox streamable={peer} />
        {/if}
    {/each}
</aside>

<style lang="scss">
    #cameras-container {
        flex: 0 0 25%;
        overflow-y: auto;
        &:first-child {
            margin-top: 2%;
        }
    }
</style>
