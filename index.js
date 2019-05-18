#!/usr/bin/env node

import { groupStart, groupStop } from './group'

async function run () {
  const group = await groupStart()
  group.collaboration.shared.on('state changed', printCollab)
  printCollab()
  const bundleImports = await group.bundleImports()
  printBundleImports()
  bundleImports.shared.on('state changed', printBundleImports)

  function printCollab () {
    console.log('collaboration', group.collaboration.shared.value())
  }

  function printBundleImports () {
    console.log('bundleImports', bundleImports.shared.value())
  }

}

run()

process.on('beforeExit', groupStop)
