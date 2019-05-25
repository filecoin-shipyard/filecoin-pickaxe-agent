#!/usr/bin/env node

import { homedir } from 'os'
import path from 'path'
import { formatWithOptions } from 'util'
import produce from 'immer'
import { mineshaftStart, mineshaftStop } from '@jimpick/filecoin-pickaxe-mineshaft'

async function run () {
  const configFile = path.resolve(
    homedir(),
    '.filecoin-pickaxe',
    'pickaxe-config'
  )
  const mineshaft = await mineshaftStart('filecoin-pickaxe-agent', configFile)
  const bundleImports = await mineshaft.bundleImports()
  const dealRequests = await mineshaft.dealRequests()
  const minerDealRequests = await mineshaft.minerDealRequests()

  printCollab()
  printBundleImports()
  printDealRequests()
  mineshaft.collaboration.shared.on('state changed', printCollab)
  bundleImports.shared.on('state changed', printBundleImports)
  dealRequests.shared.on('state changed', printDealRequests)
  minerDealRequests.shared.on('state changed', printMinerDealRequests)

  function printCollab () {
    console.log('collaboration', mineshaft.collaboration.shared.value())
  }

  function printBundleImports () {
    console.log('bundleImports', bundleImports.shared.value())
  }

  function printDealRequests () {
    console.log('dealRequests', dealRequests.shared.value())
  }

  function printMinerDealRequests () {
    console.log('minerDealRequests', minerDealRequests.shared.value())
  }

  let state = {}
  updateState()
  mineshaft.collaboration.shared.on('state changed', updateState)
  bundleImports.shared.on('state changed', updateState)

  function updateState () {
    const newState = produce(state, draft => {
      draft.bundles = mineshaft.collaboration.shared.value()
        .map(string => JSON.parse(string))
      const rawBundleImports = bundleImports.shared.value()
      const formattedBundleImports = {}
      Object.keys(rawBundleImports).forEach(bundleName => {
        const rawImports = rawBundleImports[bundleName]
        const imports = []
        Object.keys(rawImports).map(timestamp => Number(timestamp)).sort()
          .forEach(timestamp => {
            imports.push({
              timestamp,
              ...JSON.parse([...rawImports[timestamp]][0])
            })
          })

        formattedBundleImports[bundleName] = imports
      })
      draft.bundleImports = formattedBundleImports
    })
    state = newState
    // console.log('New state', formatWithOptions(state, { depth: Infinity }))
    console.log(
      'New state',
      formatWithOptions({ colors: true, depth: Infinity }, '%O', state)
    )
  }
}

run()

process.on('beforeExit', mineshaftStop)
