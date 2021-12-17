import { HtmlUtils } from "./HtmlUtils";
import { Subject, TimeInterval } from "rxjs";
import { iframeListener } from "../Api/IframeListener";
import { waScaleManager } from "../Phaser/Services/WaScaleManager";
import { coWebsites } from "../Stores/CoWebsiteStore";
import { get } from "svelte/store";
import { highlightedEmbedScreen } from "../Stores/EmbedScreensStore";

enum iframeStates {
    closed = 1,
    loading, // loading an iframe can be slow, so we show some placeholder until it is ready
    opened,
}

const cowebsiteDomId = "cowebsite"; // the id of the whole container.
const svelteOverlayDomId = "svelte-overlay";
const cowebsiteMainDomId = "cowebsite-slot-0"; // the id of the parent div of the iframe.
const cowebsiteBufferDomId = "cowebsite-buffer"; // the id of the container who contains cowebsite iframes.
const cowebsiteAsideDomId = "cowebsite-aside"; // the id of the parent div of the iframe.
const cowebsiteAsideHolderDomId = "cowebsite-aside-holder";
const cowebsiteLoaderDomId = "cowebsite-loader";
export const cowebsiteCloseButtonId = "cowebsite-close";
const cowebsiteFullScreenButtonId = "cowebsite-fullscreen";
const cowebsiteOpenFullScreenImageId = "cowebsite-fullscreen-open";
const cowebsiteCloseFullScreenImageId = "cowebsite-fullscreen-close";
const cowebsiteSlotBaseDomId = "cowebsite-slot-";
const animationTime = 500; //time used by the css transitions, in ms.

interface TouchMoveCoordinates {
    x: number;
    y: number;
}

export type CoWebsite = {
    iframe: HTMLIFrameElement;
};

coWebsites.subscribe((value) => {
    console.log(value);
});

highlightedEmbedScreen.subscribe((value) => {
    console.log(value);
});

class CoWebsiteManager {
    private openedMain: iframeStates = iframeStates.closed;

    private _onResize: Subject<void> = new Subject();
    public onResize = this._onResize.asObservable();
    /**
     * Quickly going in and out of an iframe trigger can create conflicts between the iframe states.
     * So we use this promise to queue up every cowebsite state transition
     */
    private currentOperationPromise: Promise<void> = Promise.resolve();
    private cowebsiteDom: HTMLDivElement;
    private resizing: boolean = false;
    private cowebsiteMainDom: HTMLDivElement;
    private svelteOverlayDom: HTMLDivElement;
    private cowebsiteBufferDom: HTMLDivElement;
    private cowebsiteAsideDom: HTMLDivElement;
    private cowebsiteAsideHolderDom: HTMLDivElement;
    private cowebsiteLoaderDom: HTMLDivElement;
    private previousTouchMoveCoordinates: TouchMoveCoordinates | null = null; //only use on touchscreens to track touch movement

    private loaderAnimationInterval: {
        interval: NodeJS.Timeout | undefined;
        trails: number[] | undefined;
    };

    private resizeObserver = new ResizeObserver((entries) => {
        this.resizeAllIframes();
    });

    get width(): number {
        return this.cowebsiteDom.clientWidth;
    }

    set width(width: number) {
        this.cowebsiteDom.style.width = width + "px";
    }

    set widthPercent(width: number) {
        this.cowebsiteDom.style.width = width + "%";
    }

    get height(): number {
        return this.cowebsiteDom.clientHeight;
    }

    set height(height: number) {
        this.cowebsiteDom.style.height = height + "px";
    }

    get verticalMode(): boolean {
        return window.innerWidth < window.innerHeight;
    }

    get isFullScreen(): boolean {
        return this.verticalMode ? this.height === window.innerHeight : this.width === window.innerWidth;
    }

    constructor() {
        this.cowebsiteDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDomId);
        this.svelteOverlayDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(svelteOverlayDomId);
        this.cowebsiteMainDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteMainDomId);
        this.cowebsiteBufferDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteBufferDomId);
        this.cowebsiteAsideDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteAsideDomId);
        this.cowebsiteAsideHolderDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteAsideHolderDomId);
        this.cowebsiteLoaderDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteLoaderDomId);

        this.loaderAnimationInterval = {
            interval: undefined,
            trails: undefined,
        };

        this.holderListeners();
        this.transitionListeners();

        this.resizeObserver.observe(this.cowebsiteDom);
        this.resizeObserver.observe(this.cowebsiteDom);
        this.resizeObserver.observe(this.svelteOverlayDom);

        const buttonCloseCoWebsites = HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId);
        buttonCloseCoWebsites.addEventListener("click", () => {
            if (this.isSmallScreen() && get(coWebsites).length > 1) {
                const coWebsite = this.getCoWebsiteByPosition(0);

                if (coWebsite) {
                    this.removeCoWebsiteFromStack(coWebsite);
                    return;
                }
            }

            buttonCloseCoWebsites.blur();
            this.closeCoWebsites();
        });

        const buttonFullScreenFrame = HtmlUtils.getElementByIdOrFail(cowebsiteFullScreenButtonId);
        buttonFullScreenFrame.addEventListener("click", () => {
            buttonFullScreenFrame.blur();
            this.fullscreen();
        });
    }

    public getDevicePixelRatio(): number {
        //on chrome engines, movementX and movementY return global screens coordinates while other browser return pixels
        //so on chrome-based browser we need to adjust using 'devicePixelRatio'
        return window.navigator.userAgent.includes("Firefox") ? 1 : window.devicePixelRatio;
    }

    private isSmallScreen(): boolean {
        return (
            window.matchMedia("(max-aspect-ratio: 1/1)").matches ||
            window.matchMedia("(max-width:960px) and (max-height:768px)").matches
        );
    }

    private holderListeners() {
        const movecallback = (event: MouseEvent | TouchEvent) => {
            let x, y;
            if (event.type === "mousemove") {
                x = (event as MouseEvent).movementX / this.getDevicePixelRatio();
                y = (event as MouseEvent).movementY / this.getDevicePixelRatio();
            } else {
                const touchEvent = (event as TouchEvent).touches[0];
                const last = { x: touchEvent.pageX, y: touchEvent.pageY };
                const previous = this.previousTouchMoveCoordinates as TouchMoveCoordinates;
                this.previousTouchMoveCoordinates = last;
                x = last.x - previous.x;
                y = last.y - previous.y;
            }

            this.verticalMode ? (this.height += y) : (this.width -= x);
            this.fire();
        };

        this.cowebsiteAsideHolderDom.addEventListener("mousedown", (event) => {
            if (this.isFullScreen) return;
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.closeMain();
                return;
            }

            coWebsite.iframe.style.display = "none";
            this.resizing = true;
            document.addEventListener("mousemove", movecallback);
        });

        document.addEventListener("mouseup", (event) => {
            if (!this.resizing || this.isFullScreen) return;
            document.removeEventListener("mousemove", movecallback);
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.resizing = false;
                this.closeMain();
                return;
            }

            coWebsite.iframe.style.display = "flex";
            this.resizing = false;
        });

        this.cowebsiteAsideHolderDom.addEventListener("touchstart", (event) => {
            if (this.isFullScreen) return;
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.closeMain();
                return;
            }

            coWebsite.iframe.style.display = "none";
            this.resizing = true;
            const touchEvent = event.touches[0];
            this.previousTouchMoveCoordinates = { x: touchEvent.pageX, y: touchEvent.pageY };
            document.addEventListener("touchmove", movecallback);
        });

        document.addEventListener("touchend", (event) => {
            if (!this.resizing || this.isFullScreen) return;
            this.previousTouchMoveCoordinates = null;
            document.removeEventListener("touchmove", movecallback);
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.closeMain();
                this.resizing = false;
                return;
            }

            coWebsite.iframe.style.display = "flex";
            this.resizing = false;
        });
    }

    private transitionListeners() {
        this.cowebsiteDom.addEventListener("transitionend", (event) => {
            if (this.cowebsiteDom.classList.contains("loading")) {
                this.fire();
            }

            if (this.cowebsiteDom.classList.contains("closing")) {
                this.cowebsiteDom.classList.remove("closing");
                if (this.loaderAnimationInterval.interval) {
                    clearInterval(this.loaderAnimationInterval.interval);
                }
                this.loaderAnimationInterval.trails = undefined;
            }
        });
    }

    private closeMain(): void {
        this.toggleFullScreenIcon(true);
        this.cowebsiteDom.classList.add("closing");
        this.cowebsiteDom.classList.remove("opened");
        this.openedMain = iframeStates.closed;
        this.resetStyleMain();
        this.fire();
    }

    private loadMain(): void {
        this.loaderAnimationInterval.interval = setInterval(() => {
            if (!this.loaderAnimationInterval.trails) {
                this.loaderAnimationInterval.trails = [0, 1, 2];
            }

            for (let trail = 1; trail < this.loaderAnimationInterval.trails.length + 1; trail++) {
                for (let state = 0; state < 4; state++) {
                    // const newState = this.loaderAnimationInterval.frames + trail -1;
                    const stateDom = this.cowebsiteLoaderDom.querySelector(
                        `#trail-${trail}-state-${state}`
                    ) as SVGPolygonElement;

                    if (!stateDom) {
                        continue;
                    }

                    stateDom.style.visibility =
                        this.loaderAnimationInterval.trails[trail - 1] !== 0 &&
                        this.loaderAnimationInterval.trails[trail - 1] >= state
                            ? "visible"
                            : "hidden";
                }
            }

            this.loaderAnimationInterval.trails = this.loaderAnimationInterval.trails.map((trail) =>
                trail === 3 ? 0 : trail + 1
            );
        }, 200);
        this.cowebsiteDom.classList.add("opened");
        this.openedMain = iframeStates.loading;
    }

    private openMain(): void {
        this.cowebsiteDom.addEventListener("transitionend", () => {
            this.resizeAllIframes();
        });
        this.openedMain = iframeStates.opened;
        this.resetStyleMain();
    }

    public resetStyleMain() {
        this.cowebsiteDom.style.width = "";
        this.cowebsiteDom.style.height = "";
    }

    public getCoWebsites(): CoWebsite[] {
        return get(coWebsites);
    }

    public getCoWebsiteById(coWebsiteId: string): CoWebsite | undefined {
        return get(coWebsites).find((coWebsite: CoWebsite) => coWebsite.iframe.id === coWebsiteId);
    }

    private getCoWebsiteByPosition(position: number): CoWebsite | undefined {
        let i = 0;
        return get(coWebsites).find((coWebsite: CoWebsite) => {
            if (i === position) {
                return coWebsite;
            }

            i++;
            return false;
        });
    }

    private getMainCoWebsite(): CoWebsite | undefined {
        const coWebsite = this.getCoWebsiteByPosition(0);
        if (!coWebsite) {
            console.error("No cowebsite on 0 position");
            return undefined;
        }

        return coWebsite;
    }

    private getPositionByCoWebsite(coWebsite: CoWebsite): number {
        return get(coWebsites).findIndex((currentCoWebsite) => currentCoWebsite.iframe.id === coWebsite.iframe.id);
    }

    private getSlotByCowebsite(coWebsite: CoWebsite): HTMLDivElement | undefined {
        const index = this.getPositionByCoWebsite(coWebsite);
        if (index === -1) {
            return undefined;
        }

        let id = cowebsiteSlotBaseDomId;

        if (index === 0) {
            id += "0";
        } else {
            id += coWebsite.iframe.id;
        }

        const slot = HtmlUtils.getElementById<HTMLDivElement>(id);

        if (!slot) {
            console.error(`Undefined "${id}" cowebsite slot`);
        }

        return slot;
    }

    private setIframeOffset(coWebsite: CoWebsite) {
        const coWebsiteSlot = this.getSlotByCowebsite(coWebsite);

        if (!coWebsiteSlot) {
            console.error("Undefined CoWebsite slot");
            return;
        }

        const bounding = coWebsiteSlot.getBoundingClientRect();

        coWebsite.iframe.style.top = bounding.top + "px";
        coWebsite.iframe.style.left = bounding.left + "px";
        coWebsite.iframe.style.width = bounding.right - bounding.left + "px";
        coWebsite.iframe.style.height = bounding.bottom - bounding.top + "px";

        coWebsite.iframe.classList.remove("pixel");
    }

    private setIframeClasses(coWebsite: CoWebsite) {
        const index = this.getPositionByCoWebsite(coWebsite);

        if (index === 0) {
            coWebsite.iframe.classList.remove("highlighted");
            coWebsite.iframe.classList.add("main");
        } else {
            coWebsite.iframe.classList.remove("main");
            coWebsite.iframe.classList.add("highlighted");
        }
    }

    public resizeAllIframes() {
        const mainCoWebsite = this.getCoWebsiteByPosition(0);
        const iframes: CoWebsite[] = mainCoWebsite ? [mainCoWebsite] : [];
        const highlightEmbed = get(highlightedEmbedScreen);

        if (highlightEmbed && highlightEmbed.type === "cowebsite") {
            iframes.push(highlightEmbed.embed);
        } else {
            get(coWebsites).forEach((coWebsite) => {
                if (coWebsite.iframe.classList.contains("highlighted")) {
                    coWebsite.iframe.classList.remove("highlighted");
                    coWebsite.iframe.classList.add("pixel");
                }
            });
        }

        iframes.forEach((coWebsite: CoWebsite) => {
            this.setIframeOffset(coWebsite);
            this.setIframeClasses(coWebsite);
        });
    }

    private removeCoWebsiteFromStack(coWebsite: CoWebsite) {
        coWebsites.remove(coWebsite);
        const highlighted = get(highlightedEmbedScreen);

        if (highlighted && highlighted.type === "cowebsite" && highlighted.embed.iframe.id === coWebsite.iframe.id) {
            highlightedEmbedScreen.removeHighlight();
        }

        if (get(coWebsites).length < 1) {
            this.closeMain();
        }

        coWebsite.iframe.remove();
    }

    public goToMain(coWebsite: CoWebsite) {
        const mainCoWebsite = this.getMainCoWebsite();
        coWebsites.remove(coWebsite);
        coWebsites.add(coWebsite, 0);

        if (mainCoWebsite) {
            highlightedEmbedScreen.toggleHighlight({
                type: "cowebsite",
                embed: mainCoWebsite,
            });
            this.resizeAllIframes();
        }
    }

    public searchJitsi(): CoWebsite | undefined {
        return get(coWebsites).find((coWebsite: CoWebsite) => coWebsite.iframe.id.toLowerCase().includes("jitsi"));
    }

    public loadCoWebsite(
        url: string,
        base: string,
        allowApi?: boolean,
        allowPolicy?: string,
        widthPercent?: number,
        position?: number
    ): Promise<CoWebsite> {
        return this.addCoWebsite(
            (iframeBuffer) => {
                const iframe = document.createElement("iframe");
                iframe.src = new URL(url, base).toString();

                if (allowPolicy) {
                    iframe.allow = allowPolicy;
                }

                if (allowApi) {
                    iframeListener.registerIframe(iframe);
                }

                iframeBuffer.appendChild(iframe);

                return iframe;
            },
            widthPercent,
            position
        );
    }

    public async addCoWebsite(
        callback: (iframeBuffer: HTMLDivElement) => PromiseLike<HTMLIFrameElement> | HTMLIFrameElement,
        widthPercent?: number,
        position?: number
    ): Promise<CoWebsite> {
        return new Promise((resolve, reject) => {
            if (get(coWebsites).length < 1) {
                this.loadMain();
            }

            Promise.resolve(callback(this.cowebsiteBufferDom)).then((iframe) => {
                iframe?.classList.add("pixel");

                if (!iframe.id) {
                    do {
                        iframe.id = "cowebsite-iframe-" + (Math.random() + 1).toString(36).substring(7);
                    } while (this.getCoWebsiteById(iframe.id));
                }

                const onloadPromise = new Promise<void>((resolve) => {
                    iframe.onload = () => resolve();
                });

                const coWebsite = {
                    iframe,
                };

                const onTimeoutPromise = new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), 2000);
                });

                const coWebsitePosition = position === undefined ? get(coWebsites).length : position;
                coWebsites.add(coWebsite, coWebsitePosition);

                this.currentOperationPromise = this.currentOperationPromise
                    .then(() => Promise.race([onloadPromise, onTimeoutPromise]))
                    .then(() => {
                        if (coWebsitePosition === 0) {
                            this.openMain();
                            if (widthPercent) {
                                this.widthPercent = widthPercent;
                            }

                            setTimeout(() => {
                                this.fire();
                            }, animationTime);
                        }

                        return resolve(coWebsite);
                    })
                    .catch((err) => {
                        console.error("Error loadCoWebsite => ", err);
                        this.removeCoWebsiteFromStack(coWebsite);
                        return reject();
                    });
            });
        });
    }

    public closeCoWebsite(coWebsite: CoWebsite): Promise<void> {
        this.currentOperationPromise = this.currentOperationPromise.then(
            () =>
                new Promise((resolve) => {
                    if (get(coWebsites).length === 1) {
                        this.fire();
                    }

                    if (coWebsite) {
                        iframeListener.unregisterIframe(coWebsite.iframe);
                    }

                    this.removeCoWebsiteFromStack(coWebsite);
                    resolve();
                })
        );
        return this.currentOperationPromise;
    }

    public closeJitsi() {
        const jitsi = this.searchJitsi();
        if (jitsi) {
            this.closeCoWebsite(jitsi);
        }
    }

    public closeCoWebsites(): Promise<void> {
        this.currentOperationPromise = this.currentOperationPromise.then(() => {
            get(coWebsites).forEach((coWebsite: CoWebsite) => {
                this.closeCoWebsite(coWebsite);
            });
        });
        return this.currentOperationPromise;
    }

    public getGameSize(): { width: number; height: number } {
        if (this.openedMain === iframeStates.closed) {
            return {
                width: window.innerWidth,
                height: window.innerHeight,
            };
        }
        if (!this.verticalMode) {
            return {
                width: window.innerWidth - this.width,
                height: window.innerHeight,
            };
        } else {
            return {
                width: window.innerWidth,
                height: window.innerHeight - this.height,
            };
        }
    }

    private fire(): void {
        this._onResize.next();
        waScaleManager.applyNewSize();
        waScaleManager.refreshFocusOnTarget();
    }

    private fullscreen(): void {
        if (this.isFullScreen) {
            this.toggleFullScreenIcon(true);
            this.resetStyleMain();
            this.fire();
            //we don't trigger a resize of the phaser game since it won't be visible anyway.
        } else {
            this.toggleFullScreenIcon(false);
            this.verticalMode ? (this.height = window.innerHeight) : (this.width = window.innerWidth);
            //we don't trigger a resize of the phaser game since it won't be visible anyway.
        }
    }

    private toggleFullScreenIcon(visible: boolean) {
        const openFullscreenImage = HtmlUtils.getElementByIdOrFail(cowebsiteOpenFullScreenImageId);
        const closeFullScreenImage = HtmlUtils.getElementByIdOrFail(cowebsiteCloseFullScreenImageId);

        if (visible) {
            this.cowebsiteAsideHolderDom.style.visibility = "visible";
            openFullscreenImage.style.display = "inline";
            closeFullScreenImage.style.display = "none";
        } else {
            this.cowebsiteAsideHolderDom.style.visibility = "hidden";
            openFullscreenImage.style.display = "none";
            closeFullScreenImage.style.display = "inline";
        }
    }
}

export const coWebsiteManager = new CoWebsiteManager();
