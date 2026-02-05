## Dot Text
[live demo](https://dot-text.netlify.app/)
可以在线输入,查看效果

## 功能
一个简单的文字转换为点阵的形式组件

## 参数
```typescript
interface DotType {
  text: string /* 文字内容 */
  color?: string /* 颜色 */
  fontWeight?: number /* 粗细 */
  fontSize?: number /* 大小 */
  fontFamily?: string /* 采样字体（影响点阵生成） */
  density?: number /* 采样密度（越大点越多，默认 16） */
  clear?: (callback: () => void) => void /* 清空 */
  onload?: () => void /* 渲染完成 */
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void /* 自定义图形 */
  animation?: {
    type?: 'random-fly-in' | 'morph' | 'mouse-repel'
    duration?: number
    radius?: number
    strength?: number
    returnStrength?: number
    damping?: number
  } /* 动画 */
}
```

## 动画（animation）
```html
<dot-text
  text="Move your mouse"
  :font-size="60"
  :font-weight="10"
  :animation="{ type: 'mouse-repel', radius: 120, strength: 1600, returnStrength: 30, damping: 0.88, ghostOpacity: 0.2, maxOffset: 18 }"
/>
```

更多内置特效：
```html
<!-- 点击炸开回弹 -->
<dot-text text="Click Boom" :font-size="70" :animation="{ type: 'click-explode', radius: 150, strength: 2600, ghostOpacity: 0.2, maxOffset: 22 }" />

<!-- 波浪 -->
<dot-text text="Wave" :font-size="70" :animation="{ type: 'wave', amplitude: 6, frequency: 0.022, speed: 1.4, ghostOpacity: 0.22 }" />

<!-- 呼吸缩放 -->
<dot-text text="Breath" :font-size="70" :animation="{ type: 'breath', amplitude: 0.04, speed: 1.2, ghostOpacity: 0.18 }" />
```

## 使用方法
```js
// main.ts
import { DotText } from 'dot-text'

app.component('DotText', DotText)
```
```html
// .vue
    <dot-text text="Hi,Simon" color="grey" font-size="50" font-weight="10" ma />
```
