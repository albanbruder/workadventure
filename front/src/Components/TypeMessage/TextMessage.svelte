<script lang="ts">
    import { fly } from "svelte/transition";
    import { textMessageContentStore, textMessageVisibleStore } from "../../Stores/TypeMessageStore/TextMessageStore";
    import { QuillDeltaToHtmlConverter } from "quill-delta-to-html";

    const content = JSON.parse($textMessageContentStore);
    const converter = new QuillDeltaToHtmlConverter(content.ops, { inlineStyles: true });
    const NAME_BUTTON = "Ok";

    function closeTextMessage() {
        textMessageVisibleStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeTextMessage();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="main-text-message nes-container is-rounded" transition:fly={{ y: -1000, duration: 500 }}>
    <div class="content-text-message">
        {@html converter.convert()}
    </div>
    <div class="footer-text-message">
        <button type="button" class="nes-btn is-primary" on:click|preventDefault={closeTextMessage}
            >{NAME_BUTTON}</button
        >
    </div>
</div>

<style lang="scss">
    div.main-text-message {
        display: flex;
        flex-direction: column;
        position: absolute;

        max-height: 25%;
        width: 60%;
        margin-right: auto;
        margin-left: auto;
        top: 6%;
        left: 0;
        right: 0;
        padding-bottom: 0;
        z-index: 240;

        pointer-events: auto;
        background-color: #333333;

        div.content-text-message {
            flex: 1 1 auto;
            max-height: calc(100% - 50px);
            color: whitesmoke;

            overflow: auto;
        }

        div.footer-text-message {
            height: 50px;
            text-align: center;
        }
    }
</style>
