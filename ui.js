/** A Safari-style toolbar frames the default portfolio preview, not custom images. */
export function drawSafariHeader(canvas, kind) {
  const c = canvas.getContext('2d');
  const baseWidth = kind === 'inner' ? 1440 : 390;
  const scale = canvas.width / baseWidth;
  const height = kind === 'inner' ? 64 : 48;
  c.save(); c.scale(scale, scale);
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, baseWidth, height);
  c.strokeStyle = '#d6d6d8'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, height - .5); c.lineTo(baseWidth, height - .5); c.stroke();
  const left = kind === 'inner' ? 300 : 65;
  const width = kind === 'inner' ? 840 : 248;
  const top = kind === 'inner' ? 18 : 12;
  const barHeight = kind === 'inner' ? 32 : 28;
  c.fillStyle = '#fafafa'; c.beginPath(); c.roundRect(left, top, width, barHeight, 16); c.fill();
  c.fillStyle = '#555'; c.font = `${kind === 'inner' ? 15 : 11}px 'Plus Jakarta Sans', Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('github.com/Meghamittal0920', left + width / 2, top + barHeight / 2);
  c.strokeStyle = '#777'; c.lineWidth = 1.5;
  const y = top + barHeight / 2;
  c.beginPath(); c.arc(left + width - 17, y, 5, .5, 5.6); c.stroke();
  c.restore();
  return height * scale;
}
export async function loadDefaultUIs() {
  const screens = {};
  await Promise.all(['outer', 'inner'].map(async kind => {
    const image = new Image(); image.src = `./previews/${kind}.png`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = kind === 'inner' ? Math.round(image.width * 1012 / 1440) : image.height;
    const top = kind === 'inner' ? drawSafariHeader(canvas, kind) : Math.round(canvas.height * 6 / 567);
    if (kind === 'outer') canvas.getContext('2d').drawImage(image, 0, 0, image.width, 1, 0, 0, canvas.width, top);
    canvas.getContext('2d').drawImage(image, 0, top, canvas.width, canvas.height - top);
    screens[kind] = canvas;
  }));
  return { portfolio: screens };
}
