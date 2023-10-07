import { _decorator, Component, Node } from 'cc';
import { GameSDK } from '../GameSDK';
const { ccclass, property } = _decorator;

@ccclass('test')
export class test extends Component {
    start() {
        GameSDK.instance.test()
    }
}

