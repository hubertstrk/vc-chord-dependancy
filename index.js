const fs = require('fs-extra')
const path = require('path')
const compiler = require('vue-template-compiler')
let acorn = require('acorn')

const rootPath = 'C:\\Sources\\notes2.bootstrap'

/**
 * Returns all file with extension .vue
 * @param {*} dirPath
 * @param {*} arrayOfFiles
 */
const getVueFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    if (file === 'node_modules' || file === '.git') return

    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getVueFiles(path.join(dirPath, file), arrayOfFiles)
    } else {
      if (path.extname(file) === '.vue') {
        arrayOfFiles.push(path.join(dirPath, file))
      }
    }
  })

  return arrayOfFiles
}

/**
 * Asynchronously reads a file
 * @param {*} path
 */
const readFile = (path) => fs.readFileSync(path, 'utf8')

const components = getVueFiles(rootPath).reduce((acc, path) => {
  const sfc = readFile(path)
  const compiled = compiler.parseComponent(sfc)
  if (compiled.script) {
    acc.push({path, content: compiled.script.content})
  }
  return acc
}, [])


const names = new Set()

const sfcImports = components.reduce((acc, component) => {

  const parsed = acorn.parse(component.content.toString(), {ecmaVersion: 2020, sourceType: 'module'})

  const is = parsed.body
    .filter(x => x.type === 'ImportDeclaration').filter(x => x.importDeclaration.specifiers && x.importDeclaration.specifiers.length > 0)
    .map(x => x.importDeclaration.specifiers.map(s => s.local.name))



  if (is.length > 0) {
    const source = path.parse(component.path).name
    // acc.push(...is.map(x => ({source, target: x, value: 1})))
    acc.push({
      source: replacePath(source), imports: [...is.map(x => replacePath(x))], size: 1
    })
  }
  return acc
}, [])

const regex = /\\/gi;

const replacePath = name => name.replace(regex, '.')

fs.writeFile('out-data.json', JSON.stringify(sfcImports), 'UTF-8')
fs.writeFile('out-names.json', JSON.stringify(names), 'UTF-8')