import { _decorator, Component, director, EventTouch, Input, input, math, Vec2, Node, Camera, Canvas, Widget, gfx, renderer, ScrollView, Sprite, Mask, Layout, Graphics, Layers, SpriteFrame, RichText, UITransform, Vec3, Label, Color, view, Size } from 'cc';

const { ccclass, property } = _decorator;

export const gameSDK: GameSDK = null;

enum LOG_TYPE {
    LOG,
    WARNING,
    ERROR
}

interface LogInfo {
    logType: LOG_TYPE
    log: string
}

@ccclass('GameSDK')
export class GameSDK extends Component {
    public static instance = null

    @property({ type: SpriteFrame, visible: true }) spriteframe: SpriteFrame = null

    private totalAngle: number = 0
    private prevRay: Vec2 = null
    private logListener: LogListener = null

    start() {
        GameSDK.instance = this
        director.addPersistRootNode(this.node)
        this.logListener = this.node.addComponent(LogListener)

        input.on(Input.EventType.TOUCH_START, this.onTouchStart.bind(this))
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove.bind(this))
        input.on(Input.EventType.TOUCH_END, this.onTouchMove.bind(this))
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchMove.bind(this))
    }

    getAngleFromRay(ray: Vec2, ray2: Vec2): number {
        return math.toDegree(ray.signAngle(ray2))
    }

    onTouchStart(eventData: EventTouch) {
        this.prevRay = null
        this.totalAngle = 0
    }

    onTouchMove(eventData: EventTouch) {
        let ray = eventData.touch.getDelta()
        if (ray.length() == 0)
            return

        if (this.node.getChildByName("DebuggerCanvas"))
            return

        if (this.prevRay == null)
            this.prevRay = ray

        let currentAngle = this.getAngleFromRay(ray, this.prevRay)
        this.totalAngle += currentAngle
        this.prevRay = ray
        if (this.totalAngle > 360) {
            this.node.getComponent(Widget).updateAlignment()
            let logger: DebugLogger = this.addComponent(DebugLogger)
            logger.init(this.spriteframe)
            setTimeout(() => {
                logger.insertLog(this.logListener.logs)
            }, 100)
        }
    }
}

class LogListener extends Component {
    public logs: LogInfo[] = []

    start() {
        this.orgLog = window.console.log.bind(this)
        window.console.log = this.onLog.bind(this)

        this.orgWarning = window.console.warn.bind(this)
        window.console.warn = this.onWarning.bind(this)

        this.orgError = window.console.error.bind(this)
        window.console.error = this.onError.bind(this)
    }

    private orgLog = null
    private orgWarning = null
    private orgError = null
    overrideConsole() {
        this.orgLog = window.console.log.bind(this)
        window.console.log = this.onLog.bind(this)

        this.orgWarning = window.console.warn.bind(this)
        window.console.warn = this.onWarning.bind(this)

        this.orgError = window.console.error.bind(this)
        window.console.error = this.onError.bind(this)
    }

    onLog(...data: any[]) {
        this.logs.push({ logType: LOG_TYPE.LOG, log: data[0] })
        this.orgLog(data)
    }

    onWarning(...data: any[]) {
        this.logs.push({ logType: LOG_TYPE.WARNING, log: data[0] })
        this.orgWarning(data)
    }

    onError(...data: any[]) {
        this.logs.push({ logType: LOG_TYPE.ERROR, log: data[0] })
        this.orgError(data)
    }
}

class DebugLogger extends Component {
    private readonly COLOR_BG: Color = new math.Color(0, 0, 0, 200)
    private readonly COLOR_LOG_TEXT: Color = Color.WHITE
    private readonly COLOR_WARNING_TEXT: Color = Color.YELLOW
    private readonly COLOR_ERROR_TEXT: Color = Color.RED
    private canvas: Canvas = null
    private debuggerContentNode: Node = null
    private viewmaskTransform: UITransform = null
    private contentLayout: Layout = null
    private debuggerScrollview: ScrollView = null

    init(spriteframe: SpriteFrame) {
        this.initCanvas()
        this.initScrollView(spriteframe)
    }

    insertLog(logs: LogInfo[]) {
        logs.forEach((v) => {
            switch (v.logType) {
                case LOG_TYPE.LOG:
                    this.onLog(this.COLOR_LOG_TEXT, v.log)
                    break

                case LOG_TYPE.WARNING:
                    this.onLog(this.COLOR_WARNING_TEXT, v.log)
                    break

                case LOG_TYPE.ERROR:
                    this.onLog(this.COLOR_ERROR_TEXT, v.log)
                    break
            }
        })
    }

    onLog(color: Color, ...data: any[]) {
        let node = new Node()
        node.layer = 1 << Layers.nameToLayer("UI_2D")

        let text: Label = node.addComponent(Label)
        text.string = data[0]
        text.color = color
        text.overflow = Label.Overflow.RESIZE_HEIGHT
        text.enableWrapText = true
        text.horizontalAlign = Label.HorizontalAlign.LEFT
        text.fontSize = 25
        this.debuggerContentNode.addChild(node)
        this.contentLayout.updateLayout()
        this.debuggerScrollview.scrollToBottom()
    }

    addFillParentWidget(node: Node) {
        let size : Size = view.getCanvasSize()
        let transform : UITransform = node.getComponent(UITransform)
        console.log(transform)
        transform.setContentSize(size)
    }

    initCanvas() {
        let canvasNode = new Node("DebuggerCanvas")
        canvasNode.layer = 1 << Layers.nameToLayer("UI_2D")
        this.addFillParentWidget(canvasNode)
        this.canvas = canvasNode.addComponent(Canvas)
        this.node.addChild(canvasNode)
        
        let cameraNode = new Node("UICamera")
        cameraNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let uiCamera: Camera = cameraNode.addComponent(Camera)
        uiCamera.clearFlags = Camera.ClearFlag.DONT_CLEAR
        uiCamera.clearColor = math.Color.WHITE
        uiCamera.projection = renderer.scene.CameraProjection.ORTHO
        uiCamera.visibility = 34603008
        canvasNode.addChild(cameraNode)
        this.canvas.cameraComponent = uiCamera
    }

    initScrollView(spriteframe: SpriteFrame) {
        let bgNode: Node = new Node("BG")
        bgNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let sprite: Sprite = bgNode.addComponent(Sprite)
        sprite.spriteFrame = spriteframe
        sprite.color = this.COLOR_BG
        sprite.type = Sprite.Type.SLICED
        this.addFillParentWidget(bgNode)
        this.canvas.node.addChild(bgNode)

        let scrollviewNode = new Node("Scrollview")
        scrollviewNode.layer = 1 << Layers.nameToLayer("UI_2D")

        this.addFillParentWidget(scrollviewNode)
        this.debuggerScrollview = scrollviewNode.addComponent(ScrollView)
        this.debuggerScrollview.horizontal = false
        this.debuggerScrollview.vertical = true
        this.debuggerScrollview.inertia = false
        this.debuggerScrollview.elastic = false
        this.canvas.node.addChild(scrollviewNode)

        let viewMaskNode = new Node("ViewMask")
        viewMaskNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let graphic: Graphics = viewMaskNode.addComponent(Graphics)
        let viewMask: Mask = viewMaskNode.addComponent(Mask)
        viewMask.type = Mask.Type.GRAPHICS_RECT
        this.addFillParentWidget(viewMaskNode)
        scrollviewNode.addChild(viewMaskNode)

        this.debuggerContentNode = new Node("DebuggerContent")
        this.debuggerContentNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let layout: Layout = this.debuggerContentNode.addComponent(Layout)
        layout.type = Layout.Type.VERTICAL
        layout.alignVertical = true
        layout.alignHorizontal = false;
        layout.resizeMode = Layout.ResizeMode.CONTAINER
        layout.paddingBottom = layout.paddingTop = layout.paddingLeft = layout.paddingRight = 0
        layout.spacingY = 10
        layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM
        layout.affectedByScale = false
        this.contentLayout = layout

        this.viewmaskTransform = viewMaskNode.getComponent(UITransform)
        viewMaskNode.addChild(this.debuggerContentNode)

        this.debuggerScrollview.content = this.debuggerContentNode
    }

    getViewportResolution(): Size {
        console.log(view.getResolutionPolicy())
        return Size.ONE
    }
}

