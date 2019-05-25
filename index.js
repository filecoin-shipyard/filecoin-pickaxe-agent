#!/usr/bin/env node

import { homedir } from 'os'
import path from 'path'
import { formatWithOptions } from 'util'
import produce from 'immer'
import nanobus from 'nanobus'
import nanostate from 'nanostate'
import delay from 'delay'
import { mineshaftStart, mineshaftStop } from '@jimpick/filecoin-pickaxe-mineshaft'

const activeRequests = new Map()

const bus = nanobus()

const statesAndTransitions = {
  started: { next: 'one' },
  one: { next: 'two' },
  two: { next: 'three' },
  three: { next: 'done' },
  done: {}
}

bus.on('newState', ({ dealRequests }) => {
  // console.log('New state')
  for (const dealRequestId in dealRequests) {
    if (!activeRequests.has(dealRequestId)) {
      const dealRequest = dealRequests[dealRequestId]
      activeRequests.set(dealRequestId, dealRequest)
      bus.emit('newDealRequest', dealRequestId)
    }
  }
})

bus.on('newDealRequest', async dealRequestId => {
  const dealRequest = activeRequests.get(dealRequestId)
  console.log('New deal request', dealRequestId, dealRequest)
  const machine = nanostate('started', statesAndTransitions)
  while (machine.state !== 'done') {
    console.log('Entered:', machine.state, dealRequestId)
    await delay(1000)
    machine.emit('next')
  }
  console.log('Done', dealRequestId)
})

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
    // console.log('collaboration', mineshaft.collaboration.shared.value())
  }

  function printBundleImports () {
    // console.log('bundleImports', bundleImports.shared.value())
  }

  function printDealRequests () {
    // console.log('dealRequests', dealRequests.shared.value())
  }

  function printMinerDealRequests () {
    // console.log('minerDealRequests', minerDealRequests.shared.value())
  }

  let state = {}
  updateState()
  // mineshaft.collaboration.shared.on('state changed', updateState)
  // bundleImports.shared.on('state changed', updateState)
  dealRequests.shared.on('state changed', updateState)

  function updateState () {
    const newState = produce(state, draft => {
      // bundles
      /*
      draft.bundles = mineshaft.collaboration.shared.value()
        .map(string => JSON.parse(string))
      */

      // bundleImports
      /*
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
      */

      // dealRequests
      const rawDealRequests = dealRequests.shared.value()
      const formattedDealRequests = {}
      Object.keys(rawDealRequests).forEach(dealRequestId => {
        const rawDealRequest = rawDealRequests[dealRequestId]
        const formatted = {}
        formatted.dealRequest = JSON.parse(
          [...rawDealRequest.dealRequest][0]
        )
        formattedDealRequests[dealRequestId] = formatted
      })
      draft.dealRequests = formattedDealRequests
    })
    state = newState
    // console.log('New state', formatWithOptions(state, { depth: Infinity }))
    /*
    console.log(
      'New state',
      formatWithOptions({ colors: true, depth: Infinity }, '%O', state)
    )
    */
    bus.emit('newState', state)
  }
}

run()

process.on('beforeExit', mineshaftStop)
