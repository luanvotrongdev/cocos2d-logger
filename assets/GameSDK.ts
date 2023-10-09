import { _decorator, Component, director, EventTouch, Input, input, math, Vec2, Vec3, Node, Camera, Canvas, Widget, renderer, ScrollView, Sprite, Mask, Layout, Graphics, Layers, SpriteFrame, UITransform, Label, Color, view, Size, sys, Rect, Button, color } from 'cc';

const { ccclass, property } = _decorator;

export const gameSDK: GameSDK = null;

enum LOG_TYPE {
    LOG,
    WARNING,
    ERROR
}

function LogTypeToColor(logType : LOG_TYPE) : Color {
    switch(logType)
    {
        case LOG_TYPE.LOG:
            return Color.WHITE
        case LOG_TYPE.WARNING:
            return Color.YELLOW
        case LOG_TYPE.ERROR:
            return Color.RED
    }
}

interface LogInfo {
    logType: LOG_TYPE
    log: string[]
    stack: string
}

@ccclass('GameSDK')
export class GameSDK extends Component {
    public static instance = null

    @property({ type: SpriteFrame, visible: true }) spriteframe: SpriteFrame = null

    private totalAngle: number = 0
    private prevRay: Vec2 = null
    private logger: DebugLogger = null
    private logListener: LogListener = null

    start() {
        GameSDK.instance = this
        director.addPersistRootNode(this.node)
        this.logListener = this.node.addComponent(LogListener)

        input.on(Input.EventType.TOUCH_START, this.onTouchStart.bind(this))
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove.bind(this))
        input.on(Input.EventType.TOUCH_END, this.onTouchMove.bind(this))
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchMove.bind(this))

        this.logger = this.addComponent(DebugLogger)
        this.logger.init(this.spriteframe)
        this.logger.disableLog()
    }

    getAngleFromRay(ray: Vec2, ray2: Vec2): number {
        return math.toDegree(ray.signAngle(ray2))
    }

    onTouchStart(eventData: EventTouch) {
        this.prevRay = null
        this.totalAngle = 0
        console.error("----------------")
    }

    onTouchMove(eventData: EventTouch) {
        let ray = eventData.touch.getDelta()
        console.log(ray)
        if (ray.length() == 0)
            return

        if (this.prevRay == null)
            this.prevRay = ray

        let currentAngle = this.getAngleFromRay(ray, this.prevRay)
        this.totalAngle += currentAngle
        this.prevRay = ray
        if (this.totalAngle > 360) {
            this.logger.enableLog()
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
        if (DebugLogger.instance == null)
            return
        DebugLogger.instance.insertLog({ logType: LOG_TYPE.LOG, log: data, stack: Error().stack })
        this.orgLog(data)
    }

    onWarning(...data: any[]) {
        if (DebugLogger.instance == null)
            return
        DebugLogger.instance.insertLog({ logType: LOG_TYPE.WARNING, log: data, stack: Error().stack })
        this.orgWarning(data)
    }

    onError(...data: any[]) {
        if (DebugLogger.instance == null)
            return
        DebugLogger.instance.insertLog({ logType: LOG_TYPE.ERROR, log: data, stack: Error().stack })
        this.orgError(data)
    }
}

interface AlignInfo {
    node: Node
    rect: Rect
}

class DebugLogger extends Component {
    public static instance: DebugLogger = null

    private readonly COLOR_BG: Color = new math.Color(0, 0, 0, 200)
    private canvas: Canvas = null
    private debuggerContentNode: Node = null
    private viewmaskTransform: UITransform = null
    private contentLayout: Layout = null
    private debuggerScrollview: ScrollView = null
    private stackLabel: Label = null
    private alignInfos: AlignInfo[] = []

    init(spriteframe: SpriteFrame) {
        DebugLogger.instance = this
        let fullRect: Rect = sys.getSafeAreaRect()

        this.initCanvas(fullRect)
        let y = fullRect.center.y
        let height = fullRect.height * 0.1
        let buttonsRect: Rect = new Rect(0, y, fullRect.width, height)
        this.initButtons(spriteframe, buttonsRect)
        y -= height
        height = fullRect.height * 0.4
        let stackRect: Rect = new Rect(0, y, fullRect.width, height)
        this.initStackView(spriteframe, stackRect)
        y -= height
        height = fullRect.height * 0.5
        let logRect: Rect = new Rect(0, y, fullRect.width, height)
        this.initLogView(spriteframe, logRect)
    }

    enableLog() {
        this.alignInfos.forEach(node => {
            let size: Size = node.rect.size
            let tf: UITransform = node.node.getComponent(UITransform)
            tf.anchorY = 1
            node.node.setWorldPosition(new Vec3(node.rect.xMin, node.rect.yMin, 0))
            tf.setContentSize(size)
        })
    }

    disableLog() {
        this.alignInfos.forEach(node => {
            let tf: UITransform = node.node.getComponent(UITransform)
            tf.setContentSize(Size.ZERO)
        })
    }

    insertLogs(logs: LogInfo[]) {
        logs.forEach((v) => this.insertLog(v))
    }

    insertLog(log: LogInfo) {
        let labelNode : Node = this.onLog(log)
        let button : Button = labelNode.addComponent(Button)
        button.node.on(Button.EventType.CLICK, ()=>{
            this.onLogClicked(log)
        }, this)
    }

    onLogClicked (logInfo : LogInfo) {
        let text: Label = this.stackLabel
        text.string = logInfo.stack
        text.color = LogTypeToColor(logInfo.logType)
        text.overflow = Label.Overflow.RESIZE_HEIGHT
        text.enableWrapText = true
        text.horizontalAlign = Label.HorizontalAlign.LEFT
        text.fontSize = 25
        this.addFillWidthParentWidget(text.node)
    }

    onLog(logInfo : LogInfo) : Node {
        let node = new Node()
        node.layer = 1 << Layers.nameToLayer("UI_2D")

        let text: Label = node.addComponent(Label)
        text.string = logInfo.log.join()
        text.color = LogTypeToColor(logInfo.logType)
        text.overflow = Label.Overflow.RESIZE_HEIGHT
        text.enableWrapText = true
        text.horizontalAlign = Label.HorizontalAlign.LEFT
        text.fontSize = 25
        this.addFillWidthParentWidget(node)

        this.debuggerContentNode.addChild(node)
        this.debuggerScrollview.scrollToBottom()
        return node
    }

    addFillParentWidget(node: Node, rect: Rect) {
        this.alignInfos.push({ node: node, rect: rect })
    }

    addFillWidthParentWidget(node: Node) {
        let widget: Widget = node.addComponent(Widget)
        widget.isAlignLeft = widget.isAlignRight = true
        widget.left = widget.right = 0
        widget.alignMode = Widget.AlignMode.ALWAYS
    }

    addFillHeightParentWidget(node: Node) {
        let widget: Widget = node.addComponent(Widget)
        widget.isAlignTop = widget.isAlignBottom = true
        widget.top = widget.bottom = 0
        widget.alignMode = Widget.AlignMode.ALWAYS
    }

    initCanvas(rect: Rect) {
        let canvasNode = new Node("DebuggerCanvas")
        canvasNode.layer = 1 << Layers.nameToLayer("UI_2D")
        this.addFillParentWidget(canvasNode, rect)
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

    initButtons(spriteframe: SpriteFrame, rect: Rect) {
        let bgNode: Node = new Node("BG")
        bgNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let sprite: Sprite = bgNode.addComponent(Sprite)
        sprite.spriteFrame = spriteframe
        sprite.color = this.COLOR_BG
        sprite.type = Sprite.Type.SLICED
        this.addFillParentWidget(bgNode, rect)
        this.canvas.node.addChild(bgNode)

        let layout : Layout = bgNode.addComponent(Layout)
        layout.type = Layout.Type.HORIZONTAL
        layout.alignVertical = true
        layout.alignHorizontal = true;
        layout.resizeMode = Layout.ResizeMode.CHILDREN
        layout.paddingBottom = layout.paddingTop = layout.paddingLeft = layout.paddingRight = 0
        layout.spacingY = 10
        layout.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT
        layout.affectedByScale = false

        let clearNode : Node = new Node("ClearBtn")
        clearNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let clearSprite: Sprite = clearNode.addComponent(Sprite)
        clearSprite.spriteFrame = spriteframe
        clearSprite.color = Color.YELLOW
        clearSprite.type = Sprite.Type.SLICED
        this.addFillHeightParentWidget(clearNode)
        let clearBtn : Button = clearNode.addComponent(Button)
        clearBtn.node.on(Button.EventType.CLICK, ()=>{
            this.stackLabel.string = ""
            this.debuggerContentNode.destroyAllChildren()
        }, this)
        bgNode.addChild(clearNode)

        let closeNode : Node = new Node("CloseBtn")
        closeNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let closeSprite: Sprite = closeNode.addComponent(Sprite)
        closeSprite.spriteFrame = spriteframe
        closeSprite.color = Color.RED
        closeSprite.type = Sprite.Type.SLICED
        this.addFillHeightParentWidget(closeNode)
        let closeBtn : Button = closeNode.addComponent(Button)
        closeBtn.node.on(Button.EventType.CLICK, ()=>{
            this.disableLog()
        }, this)
        bgNode.addChild(closeNode)
    }

    initStackView(spriteframe: SpriteFrame, rect: Rect) {
        let bgNode: Node = new Node("BG")
        bgNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let sprite: Sprite = bgNode.addComponent(Sprite)
        sprite.spriteFrame = spriteframe
        sprite.color = this.COLOR_BG
        sprite.type = Sprite.Type.SLICED
        this.addFillParentWidget(bgNode, rect)
        this.canvas.node.addChild(bgNode)

        let scrollviewNode = new Node("StackScrollview")
        scrollviewNode.layer = 1 << Layers.nameToLayer("UI_2D")

        this.addFillParentWidget(scrollviewNode, rect)
        let stackScrollview = scrollviewNode.addComponent(ScrollView)
        stackScrollview.horizontal = false
        stackScrollview.vertical = true
        stackScrollview.inertia = false
        stackScrollview.elastic = false
        this.canvas.node.addChild(scrollviewNode)

        let viewMaskNode = new Node("ViewMask")
        viewMaskNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let graphic: Graphics = viewMaskNode.addComponent(Graphics)
        let viewMask: Mask = viewMaskNode.addComponent(Mask)
        viewMask.type = Mask.Type.GRAPHICS_RECT
        this.addFillParentWidget(viewMaskNode, rect)
        scrollviewNode.addChild(viewMaskNode)

        let stackContentNode = new Node("StackContent")
        this.addFillParentWidget(stackContentNode, rect)
        stackContentNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let layout: Layout = stackContentNode.addComponent(Layout)
        layout.type = Layout.Type.VERTICAL
        layout.alignVertical = true
        layout.alignHorizontal = false;
        layout.resizeMode = Layout.ResizeMode.CONTAINER
        layout.paddingBottom = layout.paddingTop = layout.paddingLeft = layout.paddingRight = 0
        layout.spacingY = 10
        layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM
        layout.affectedByScale = false

        this.viewmaskTransform = viewMaskNode.getComponent(UITransform)
        viewMaskNode.addChild(stackContentNode)

        let stackLabelNode = new Node("Stack")
        stackLabelNode.layer = 1 << Layers.nameToLayer("UI_2D")

        this.stackLabel = stackLabelNode.addComponent(Label)
        this.stackLabel.string = ""
        this.addFillWidthParentWidget(stackLabelNode)
        stackContentNode.addChild(stackLabelNode)

        stackScrollview.content = stackContentNode
    }

    initLogView(spriteframe: SpriteFrame, rect: Rect) {
        let bgNode: Node = new Node("BG")
        bgNode.layer = 1 << Layers.nameToLayer("UI_2D")
        let sprite: Sprite = bgNode.addComponent(Sprite)
        sprite.spriteFrame = spriteframe
        sprite.color = this.COLOR_BG
        sprite.type = Sprite.Type.SLICED
        this.addFillParentWidget(bgNode, rect)
        this.canvas.node.addChild(bgNode)

        let scrollviewNode = new Node("Scrollview")
        scrollviewNode.layer = 1 << Layers.nameToLayer("UI_2D")

        this.addFillParentWidget(scrollviewNode, rect)
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
        this.addFillParentWidget(viewMaskNode, rect)
        scrollviewNode.addChild(viewMaskNode)

        this.debuggerContentNode = new Node("DebuggerContent")
        this.addFillParentWidget(this.debuggerContentNode, rect)
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
}

