const { spawn } = require('child_process')
const PQueue = require('p-queue')
const delay = require('delay')

const queue = new PQueue({ concurrency: 6 })

async function queueProposeDeal (jobBus, dealRequestId, dealRequest) {
  queue.add(() => run())

  async function run () {
    await delay(0)
    jobBus.emit('started')
    await delay(0)
    console.log('Job started', dealRequestId)
    const before = Date.now()
    const { cid, ask, duration } = dealRequest
    const prefix = `${dealRequestId}:`
    console.log(
      prefix,
      `go-filecoin client propose-storage-deal ` +
      `--allow-duplicates ${ask.miner} ${cid} ${ask.id} ${duration}`
    )
    try {
      const [output, code] = await spawnAndWait(
        'go-filecoin',
        [
          'client',
          'propose-storage-deal',
          '--allow-duplicates',
          ask.miner,
          cid,
          `${ask.id}`,
          `${duration}`
        ],
        { prefix }
      )
      const elapsed = Math.floor((Date.now() - before) / 1000)
      console.log(`${dealRequestId}: Done in ${elapsed}s. Exit code: ${code}`)
      let errorMsg
      let dealId
      output.split('\n').map(line => {
        const matchError = line.match(/^Error: (.*)/)
        if (matchError) {
          errorMsg = matchError[1]
        }
        const matchDealId = line.match(/^DealID: *(.*)/)
        if (matchDealId) {
          dealId = matchDealId[1]
        }
      })
      if (code === 0) {
        jobBus.emit('success', { dealId })
      } else {
        jobBus.emit('fail', { errorMsg })
      }
      console.log('Job finished', dealRequestId)
    } catch (e) {
      console.error('Propose deal error', e)
      jobBus.emit('fail')
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
			process.stdout.write(`${options.prefix} ${data.toString()}`)
			output += data
		}
	})
	return promise
}

module.exports = {
  queueProposeDeal
}

