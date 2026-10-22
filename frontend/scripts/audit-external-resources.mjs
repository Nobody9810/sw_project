import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const external = value => /^(?:https?:)?\/\//i.test(value)
const blocked = value => {
  const host = new URL(value, 'https://site.local').hostname
  return /(^|\.)(google\.com|googleapis\.com|gstatic\.com|youtube\.com|youtube-nocookie\.com|facebook\.com|facebook\.net|instagram\.com|twitter\.com|baidu\.com|qq\.com)$/.test(host)
}
const literal = node => {
  if (!node) return ''
  if (ts.isJsxExpression(node)) return literal(node.expression)
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : ''
}

export function checkAutomaticResources(source, filename) {
  const issues = []
  if (filename.endsWith('.css')) {
    for (const match of source.matchAll(/(?:url\(\s*|@import\s+)["']?((?:https?:)?\/\/[^\s"')]+)/gi)) {
      issues.push(`CSS 外部资源：${match[1]}`)
    }
    return issues
  }
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const visit = node => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree)
      const attrs = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute)
        .map(attr => [attr.name.getText(tree), literal(attr.initializer)]))
      if (['script', 'Script'].includes(tag) && external(attrs.src || '')) {
        if (blocked(attrs.src) || tag !== 'Script' || attrs.strategy !== 'lazyOnload') issues.push(`外部脚本：${attrs.src}`)
      }
      if (tag === 'link' && external(attrs.href || '') && attrs.rel !== 'canonical' && attrs.rel !== 'alternate') issues.push(`外部资源链接：${attrs.href}`)
      if (['iframe', 'img'].includes(tag) && external(attrs.src || '') && (tag === 'iframe' || blocked(attrs.src))) issues.push(`外部嵌入：${attrs.src}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return issues
}

export function audit(root) {
  const inventory = {}, issues = []
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.next') || entry.name === '.git') continue
      const filename = path.join(directory, entry.name)
      if (entry.isDirectory()) { walk(filename); continue }
      if (!/\.(?:[cm]?js|jsx|tsx?|css|html|svg|json)$/.test(entry.name) || entry.name === 'package-lock.json') continue
      const relative = path.relative(root, filename)
      const source = fs.readFileSync(filename, 'utf8')
      for (const host of new Set(Array.from(source.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g), match => match[1]))) {
        ;(inventory[host] ||= []).push(relative)
      }
      if (relative.startsWith('src/') || relative.startsWith('pages/')) {
        for (const issue of checkAutomaticResources(source, relative)) issues.push({ file: relative, issue })
      }
    }
  }
  walk(root)
  return { inventory, issues }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = audit(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  if (result.issues.length) process.exitCode = 1
}
