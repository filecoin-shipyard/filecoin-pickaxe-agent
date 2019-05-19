#!/usr/bin/env node

import { formatWithOptions } from 'util'
import produce from 'immer'
import { groupStart, groupStop } from './group'

async function run () {
  const group = await groupStart()
  const bundleImports = await group.bundleImports()

  printCollab()
  printBundleImports()
  group.collaboration.shared.on('state changed', printCollab)
  bundleImports.shared.on('state changed', printBundleImports)

  function printCollab () {
    console.log('collaboration', group.collaboration.shared.value())
  }

  function printBundleImports () {
    console.log('bundleImports', bundleImports.shared.value())
  }

  let state = {}
  updateState()
  group.collaboration.shared.on('state changed', updateState)
  bundleImports.shared.on('state changed', updateState)

  function updateState () {
    const newState = produce(state, draft => {
      draft.bundles = group.collaboration.shared.value()
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

process.on('beforeExit', groupStop)
