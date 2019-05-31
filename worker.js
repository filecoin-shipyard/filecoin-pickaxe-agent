const { spawn } = require('child_process')
const PQueue = require('p-queue')
const delay = require('delay')

const queue = new PQueue({ concurrency: 3 })

async function queueProposeDeal (jobBus) {
  queue.add(() => run())

  async function run () {
    await delay(0)
    jobBus.emit('started')
    console.log('Job started')
    await delay(5000)
    console.log('Job finished')
    jobBus.emit('finished')
  }
}

module.exports = {
  queueProposeDeal
}

