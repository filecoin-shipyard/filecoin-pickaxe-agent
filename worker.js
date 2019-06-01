const { spawn } = require('child_process')
const PQueue = require('p-queue')
const delay = require('delay')

const queue = new PQueue({ concurrency: 3 })

async function queueProposeDeal (jobBus, dealRequestId, dealRequest) {
  queue.add(() => run())

  async function run () {
    await delay(0)
    jobBus.emit('started')
    await delay(0)
    console.log('Job started', dealRequestId, dealRequest)
    const before = Date.now()
    const { cid, ask, duration } = dealRequest
    console.log(
      `go-filecoin client propose-storage-deal ` +
      `--allow-duplicates ${ask.miner} ${cid} ${ask.id} ${duration}`
    )
    try {
      const [output, code] = await spawnAndWait('go-filecoin', [
        'client',
        'propose-storage-deal',
        '--allow-duplicates',
        ask.miner,
        cid,
        `${ask.id}`,
        `${duration}`
      ], { prefix: `${dealRequestId}: ` } )
      const elapsed = Math.floor((Date.now() - before) / 1000)
      console.log(`${dealRequestId}: Done in ${elapsed}s. Exit code: ${code}`)
      console.log('Job finished')
      jobBus.emit('finished')
    } catch (e) {
      console.error('Propose deal error', e)
      jobBus.emit('error')
    }
  }
}

function spawnAndWait (cmd, args, options = {}) {
	const promise = new Promise((resolve, reject) => {
		let output = ''
		const child = spawn(cmd, args)
		child.stdout.on('data', appendOutput)
		child.stderr.on('data', appendOutput)
		child.on('close', code => resolve([output, code]))
		child.on('error', e => reject(e))

		function appendOutput (data) {
			process.stdout.write(`${options.prefix}${data.toString()}`)
			output += data
		}
	})
	return promise
}

module.exports = {
  queueProposeDeal
}

