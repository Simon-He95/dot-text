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
  clear?: (callback: () => void) => void /* 清空 */
  onload?: () => void /* 渲染完成 */
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void /* 自定义图形 */
}
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
