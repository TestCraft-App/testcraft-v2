export interface GenerationEntry {
    id: string;
    content: string;
    elementLabel: string;
    pageUrl: string;
    timestamp: number;
    selectedIdeas?: Set<number>;
}

export interface PickedElement {
    outerHTML: string;
    tagName: string;
    textContent: string;
    attributes: Record<string, string>;
    boundingRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    screenshot?: string;
    pageUrl: string;
    pageTitle: string;
}

export interface ElementPickedMessage {
    action: typeof import('./constants').ACTIONS.ELEMENT_PICKED;
    payload: PickedElement;
}

export interface CaptureScreenshotMessage {
    action: typeof import('./constants').ACTIONS.CAPTURE_SCREENSHOT;
    payload: {
        boundingRect: PickedElement['boundingRect'];
    };
}

export interface ScreenshotCapturedMessage {
    action: typeof import('./constants').ACTIONS.SCREENSHOT_CAPTURED;
    payload: {
        screenshot: string;
    };
}

export interface StartPickingMessage {
    action: typeof import('./constants').ACTIONS.START_PICKING;
}

export interface StopPickingMessage {
    action: typeof import('./constants').ACTIONS.STOP_PICKING;
}

export interface HighlightElementMessage {
    action: typeof import('./constants').ACTIONS.HIGHLIGHT_ELEMENT;
    payload: {
        selector: string;
    };
}

export interface ClearHighlightMessage {
    action: typeof import('./constants').ACTIONS.CLEAR_HIGHLIGHT;
}

export interface GoogleSignInMessage {
    action: typeof import('./constants').ACTIONS.GOOGLE_SIGN_IN;
}

export interface AuthUser {
    email: string;
    name: string;
    picture: string;
}

export interface GoogleSignInResponse {
    token: string;
    user: AuthUser;
}

export type ExtensionMessage =
    | ElementPickedMessage
    | CaptureScreenshotMessage
    | ScreenshotCapturedMessage
    | StartPickingMessage
    | StopPickingMessage
    | HighlightElementMessage
    | ClearHighlightMessage
    | GoogleSignInMessage;
