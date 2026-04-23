export function log(msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`${ts} ${msg}`)
}
