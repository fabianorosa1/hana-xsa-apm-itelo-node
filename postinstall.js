const fs = require('fs')
const path = require('path')

/**
 *
 * @param {String} folder - Check and create this folder(s)
 */
const _createMissingFolders = (folder) => {
  if (fs.existsSync(folder)) {
    console.log(`folder ${folder} already exists`)
    return
  }

  let folderTravel = path.resolve('.')

  console.log(`creating folder ${folderTravel}`)

  for (const segment of folder.split(path.sep)) {
    folderTravel = path.resolve(folderTravel, './' + segment)

    if (!fs.existsSync(folderTravel)) {
      console.log(`creating folder ${folderTravel}`)
      fs.mkdirSync(folderTravel)
    }
  }
}

const _copyFile = (source, target) => {
  return new Promise((resolve, reject) => {
    console.log(`copy from ${source} to ${target}`)

    // Open streams
    const readStream = fs.createReadStream(source)
    const writeStream = fs.createWriteStream(target)

    // Register error handler
    readStream.on('error', reject)
    writeStream.on('error', reject)

    // register enf of copy
    writeStream.on('close', resolve)

    // Pipe read into write to handle backpreasure
    readStream.pipe(writeStream)
  })
    .then(() => {
      console.log(`copied: ${source} ${target}`)
    })
    .catch((err) => {
      console.error(`copy failed: ${source} ${target}`)
      console.error(err)
    })
}

/**
 *
 * @param {String} source - Source folder
 * @param {String} target - Target folder
 */
const _listAndCopy = (source, target) => {
  const skipFolders = ['.che', 'WEB-INF']
  const validExtensions = ['.json', '.jpg', '.csv', '.html', '.hdbtabledata', '.properties']

  return new Promise((resolve, reject) => {
    fs.readdir(source, (err, entries) => {
      if (err) {
        reject(err)
        return
      }

      const copies = []

      for (const entry of entries) {
        const {base, ext} = path.parse(entry)

        if (fs.lstatSync(path.join(source, entry)).isDirectory()) {
          if (!skipFolders.includes(entry)) {
            copies.push(copyRecursive(path.join(source, entry), path.join(target, entry)))
          } else {
            console.log(`skipping folder ${entry} due to blacklisting`)
          }
        } else if (validExtensions.includes(ext) || entry === '.hdiconfig') {
          copies.push(_copyFile(path.join(source, entry), path.resolve(target, base)))
        } else {
          console.log(`skipping ${base} due to invalid extension '${ext}'`)
        }
      }

      Promise.all(copies)
        .then(resolve)
        .catch(reject)
    })
  })
}

/**
 * Copy the contents from target to source
 * @param {String} source - Source folder
 * @param {String} target - Target folder
 */
const copyRecursive = (source, target) => {
  source = path.normalize(source)
  target = path.normalize(target)

  if (!fs.existsSync(source)) {
    console.log(`Skipping not existing folder: ${source}`)
    return Promise.resolve()
  }

  console.log(`Starting to copy from ${source} to ${target}`)

  _createMissingFolders(target)

  return _listAndCopy(source, target)
}

const copy = (module) => {
  return Promise.all([
    copyRecursive(`node_modules/${module}/_i18n`, 'srv/_i18n'),
    copyRecursive(`node_modules/${module}/db/src/`, 'db/src'),
//    copyRecursive(`node_modules/${module}/approuter`, 'approuter'),
    copyRecursive(`node_modules/${module}/ui-iteloCatalog`, 'app')
  ])
}

const _rmrf = (folder) => {
  const rimraf = require('rimraf')

  return new Promise((resolve, reject) => {
    const resolved = path.resolve(folder)

    if (!fs.existsSync(resolved) || !fs.lstatSync(resolved).isDirectory()) {
      console.log(`Cannot delete folder ${resolved} as it does not exist`)
      resolve()
      return
    }

    console.log(`deleting folder ${resolved} recursively`)

    rimraf(folder, (err) => {
      if (err) {
        reject(err)
        return
      }

      resolve()
    })
  })
}

const cleanup = () => {
  return Promise.all([
    _rmrf('srv/_i18n'),
    _rmrf('db/src/_csv'),
//    _rmrf('approuter'),
    _rmrf('app')
  ])
}

// Start the copy process, which is needed only initially and might go away completely
cleanup()
  .then(() => {
    return copy('@sap/cloud-samples-catalog')
  })
  .then(() => {
    return copy('@sap/cloud-samples-foundation')
  })
  .then(() => {
    return copy('cloud-samples-itelo')
  })
  .then(() => {
    console.log('All files copied')
  })
  .catch(console.error)