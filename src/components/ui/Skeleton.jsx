export function Sk({ w = '100%', h = 14, style = {} }) {
  return <div className="skel" style={{ width: w, height: h, ...style }} />;
}
