import { _decorator, Component, Director, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('main')
export class main extends Component {
    start() {
        setTimeout(() => {
            Director.instance.loadScene("test")
        }, 2000);
    }
}

