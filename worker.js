const { spawn } = require('child_process')
const PQueue = require('p-queue')
const delay = require('delay')

const queue = new PQueue({ concurrency: 10 })

async function queueProposeDeal (jobBus) {
  async function run () {
    await delay(3000)
    jobBus.emit('started')
  }
  run()
}

module.exports = {
  queueProposeDeal
}

