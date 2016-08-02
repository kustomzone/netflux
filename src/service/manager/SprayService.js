import ManagerInterface from 'service/manager/ManagerInterface'
import ChannelBuilderService from 'service/ChannelBuilderService'

// TODO: broadcast: ne traiter que les broadcast non reçus (3 -> 1 -> 2 -> 4 & 5 -> 1, ne pas traiter la deuxieme / troisieme fois au 1)
// TODO: onPeerDown: fermer les channels avec le peer down
// TODO: updateChannels: fermer les channels avec les peers qui ne sont plus connus
// TODO: réaliser onArcDown (se déclenche en théorie lors d'un fail à l'établissement de la connexion)
// TODO: sendTo: améliorer le code, torp de pertes de perf

/**
 * Spray web channel manager. Implements spray topology
 * network, when each peer is connected to ln(N) other peers.
 *
 * @extends module:webChannelManager~WebChannelManagerInterface
 */
class SprayService extends ManagerInterface {

	constructor() {
		super()
	}

	add(channel) {
		let wc = channel.webChannel
	    let peerIds = new Set([wc.myId])
	    let jpIds = new Set()
	    for (let i = 0 ; i < wc.knownPeers.length ; i++) {
	    	peerIds.add(wc.knownPeers[i].peerId)
	    }
	    // wc.getJoiningPeers().forEach((jp) => {
		   //  if (channel.peerId !== jp.id && !peerIds.has(jp.id)) {
		   //      jpIds.add(jp.id)
		   //  }
	    // })
	    return this.connectWith(wc, channel.peerId, channel.peerId, [...peerIds], [...jpIds])
	}

	broadcast(webChannel, data, message) {
		// TODO: améliorer le message stocké dans broadcastedMsg et supprimer data useless pour éviter d'avoir des doublons de messages qui différent juste par ces data
		let isAlreadyBroadcasted = false

		for (let i = 0 ; i < webChannel.broadcastedMsg.length ; i++) {
			if (JSON.stringify(webChannel.broadcastedMsg[i].data) === JSON.stringify(message.data)
					/*&& this.broadcastedMsg[i].header.code === message.header.code*/) {
				isAlreadyBroadcasted = true
				break
			}
		}

		if (!isAlreadyBroadcasted) {
			let d

			for (let i = 0 ; i < webChannel.knownPeers.length ; i++) {
				for (let c of webChannel.channels) {
					if (c.peerId === webChannel.knownPeers[i].peerId && c.peerId != message.data.initialHeader.senderId) {
				      	d = (typeof window === 'undefined') ? data.slice(0) : data
				      	c.send(d)
				      	webChannel.broadcastedMsg[webChannel.broadcastedMsg.length] = message
				    }
			    }
			}
		}
	}

	sendTo(id, webChannel, data) {
		// console.log('from', webChannel.myId, 'to', id, data)
		let directChannelExists = false
		// let isKnownPeer = false
		// let channelExists = false
		let randIndex
		// for (let kp of webChannel.knownPeers) {
		// 	if (typeof kp !== 'undefined') {
		// 		if (kp.peerId === id) {
		// 			isKnownPeer = true
		// 		}
		// 	}
		// }

		webChannel.channels.forEach((c) => {
			if (c.peerId === id) {
				directChannelExists = true
				return
			}
		})

		// if (!isKnownPeer) {
		// 	webChannel.channels.forEach((c) => {
		// 		if (c.peerId === id) {
		// 			channelExists = true
		// 			return
		// 		}
		// 	})
		// 	if (channelExists) {
		// 		directChannelExists = true
		// 	}
		// } else {
		// 	webChannel.channels.forEach((c) => {
		// 		if (c.peerId === id) {
		// 			channelExists = true
		// 			return
		// 		}
		// 	})
		// 	if (channelExists) {
		// 		directChannelExists = true
		// 	}
		// 	// directChannelExists = true
		// }

		if (directChannelExists) {
			webChannel.channels.forEach((c) => {
				// console.log('this one', c.peerId, id, webChannel.knownPeers)
				if (c.peerId === id) {
					// console.log('i send data')
					c.send(data)
					return
				}
			})
		} else {
			randIndex = Math.ceil(Math.random() * webChannel.knownPeers.length) - 1
			// console.log('i am here', webChannel.myId)
			while (webChannel.knownPeers[randIndex].peerId === id) {
				randIndex = Math.ceil(Math.random() * webChannel.knownPeers.length) - 1
			}
			webChannel.forwardMsg(id, data, webChannel.knownPeers[randIndex].peerId)
		}
	}

	/**
	 * Implementation of the Spray algorithm to shuffle known peers.
	 * @param {WebChannel} webChannel - webChannel which initialize the exchange 
	 */
	shuffle(webChannel) {
		if (webChannel.knownPeers.length > 0) {
			let oldest = webChannel.knownPeers[0]
			let sample
			let isDeleted
			// console.log()
			// console.log('------ Shuffle ------')

			// increment age
			webChannel.knownPeers.forEach((kp) => { if (typeof kp !== 'undefined') { kp.peerAge = kp.peerAge + 1 } })

			// get oldest
			webChannel.knownPeers.forEach((kp) => {
				if (typeof kp !== 'undefined') {
					if (kp.peerAge > oldest.peerAge) { oldest = kp }
				}
			})

			webChannel.isPeerReachable(oldest.peerId)
				.then(() => {
					// if oldest is reachable, exchange with it
					// console.log(oldest.peerId, 'is reachable')

					// select half of the neighbors excluding one occurrence of oldest
					sample = webChannel.getSample(webChannel.knownPeers, Math.ceil(webChannel.knownPeers.length / 2) -1)


					// console.log('sample :', sample)

					// replace oldest occurrences with itself occurrences
					sample.forEach((kp) => {
						if (kp.peerId === oldest.peerId) {
							kp.peerId = webChannel.myId
						}
					})

					// add one occurrence of itself to this sample and send this sample to oldest
					sample.push({peerId: webChannel.myId, peerAge: 0})

					// console.log('myId :', webChannel.myId)
					// console.log('knownPeers: ', webChannel.knownPeers)
					// console.log('oldest: ', oldest)
					// console.log('sample :', sample)
					// console.log('channels:', webChannel.channels)

					webChannel.sendToPeerForShuffle(oldest.peerId, {origin: webChannel.myId, sample})

					// replace itself occurrences with oldest occurrences and delete the sample from the partial view
					sample.forEach((kp) => {
						if (kp.peerId === webChannel.myId) {
							kp.peerId = oldest.peerId
						}
					})

					for (let i = 0 ; i < sample.length ; i++) {
						isDeleted = false
						for (let j = 0 ; j < webChannel.knownPeers.length ; j++) {
							if (typeof webChannel.knownPeers[j] !== 'undefined') {
								// console.log(webChannel.knownPeers[j])
								if (!isDeleted && webChannel.knownPeers[j].peerId === sample[i].peerId ) {
									delete webChannel.knownPeers[j]
									isDeleted = true
								}
							}
						}
					}

					// some lines to avoid undefined elements
					webChannel.knownPeers.sort()
					webChannel.knownPeers.length = webChannel.knownPeers.length - sample.length

					// console.log('new knownPeers: ', webChannel.knownPeers)
				})
				.catch((e) => {
					// if oldest is unreachable handle it and repeat process
					// console.log(oldest.peerId, 'is unreachable, reason :', e)

					// handle the departure
					this.onPeerDown(webChannel, oldest.peerId)

					// repeat the shuffling process
					this.shuffle(webChannel)
				})
		}
	}

	/**
	 * Is called when receiving the demand for shuffle of an other webChannel
	 * @param {WebChannel} webChannel - webChannel which answers to the webChannel that initialized the shuffle
	 * @param {int} originId - id of the webChannel that initialized the shuffle
	 * @param {array} sample - array containing the {peerId, peerAge} duos sent by the webChannel that initialized the shuffle
	 */
	onExchange(webChannel, originId, sample) {
		let responseSample = webChannel.getSample(webChannel.knownPeers, Math.ceil(webChannel.knownPeers.length / 2))
		let isDeleted

		// console.log()
		// console.log('------ onExchange ------')
		// console.log('myId', webChannel.myId, 'knownPeers: ', webChannel.knownPeers)
		// console.log('received sample:', sample, 'origin:', originId)

		// replace origin occurrences with itself occurrences and send the response to origin
		responseSample.forEach((kp) => {
			if (kp.peerId === originId) {
				kp.peerId = webChannel.myId
			}
		})

		// console.log('myId', webChannel.myId, 'answer :', responseSample, 'dest:', originId)
		// console.log('knownpeers', webChannel.knownPeers)

		webChannel.sendToPeerForShuffleAnswer(originId, responseSample)

		// replace itself occurrences with origin occurrences and delete the sample from the partial view
		responseSample.forEach((kp) => {
			if (kp.peerId === webChannel.myId) {
				kp.peerId = originId
			}
		})

		for (let i = 0 ; i < responseSample.length ; i++) {
			isDeleted = false
			for (let j = 0 ; j < webChannel.knownPeers.length ; j++) {
				if (typeof webChannel.knownPeers[j] !== 'undefined') {
					// TODO: Il est possible que le check de l'age pose problème. A tester
					if (!isDeleted && webChannel.knownPeers[j].peerId === responseSample[i].peerId 
					  && webChannel.knownPeers[j].peerAge === responseSample[i].peerAge) {
						delete webChannel.knownPeers[j]
						// console.log('myId :', webChannel.myId, 'deleted :', responseSample[i].peerId)
						isDeleted = true
					}
				}
			}
		}

		// some lines to avoid undefined elements
		webChannel.knownPeers.sort()
		webChannel.knownPeers.length = webChannel.knownPeers.length - responseSample.length

		// add the sample send by the origin to the partial view
		webChannel.knownPeers = webChannel.knownPeers.concat(sample)
		// console.log('new knownpeers', webChannel.knownPeers)

		this.updateChannels(webChannel)

		// console.log('channels', webChannel.channels)
	}

	/**
	 * End of the shuffle. The initiator receives a sample that it adds to its knowPeers
	 * @param {WebChannel} webChannel - the webChannel that receives the sample, it is the one which initialized the shuffle.
	 * @param {array} sample - array containing the {peerId, peerAge} duos sent by the webChannel in response of the shuffle.
	 */
	onShuffleEnd(webChannel, sample) {
		// console.log()
		// console.log('------ onShuffleEnd ------')
		// console.log('myId', webChannel.myId, 'knownPeers: ', webChannel.knownPeers)
		webChannel.knownPeers = webChannel.knownPeers.concat(sample)
		// console.log('myId', webChannel.myId, 'new knownPeers: ', webChannel.knownPeers)
		this.updateChannels(webChannel)
		// console.log('myId', webChannel.myId, 'new channels: ', webChannel.channels)
	}

	/**
	 * Updates the channels of a webChannel accordingly to its knownPeers
	 * @param {WebChannel} webChannel - the webChannel that have to updates its channels
	 */
	updateChannels(webChannel) {
		// console.log('WC:', webChannel.myId, webChannel.knownPeers)
		let isKnown
		let hasChannel
		let cBlder = new ChannelBuilderService()

		// Check if all known peers have a channel associated
		for (let i = 0 ; i < webChannel.knownPeers.length ; i++) {
			hasChannel = false
			for (let c of webChannel.channels) {
				// console.log(c.peerId, webChannel.knownPeers[i].peerId)
				if (c.peerId === webChannel.knownPeers[i].peerId) {
					hasChannel = true
					break
				}
			}
			// if not, create a new one
			if (!hasChannel) {
				// create a new channel
				// console.log('I am trying to connect to', webChannel.knownPeers[i].peerId, '... Please wait.', webChannel.myId)
				// this.connectWith(webChannel, webChannel.knownPeers[i].peerId, null, new Set([webChannel.myId]), new Set())
				cBlder.connectMeTo(webChannel, webChannel.knownPeers[i].peerId)
					.then((channel) => {
						webChannel.channels.add(channel)
					})
					.catch((e) => console.log('failed to connectMeTo, because :', e))
			}
		}

		// Delete all channels that belongs to unknown peers
		for (let c of webChannel.channels) {
			isKnown = false
			for (let i = 0 ; i < webChannel.knownPeers.length ; i++) {
				if (webChannel.knownPeers[i].peerId === c.peerId) {
					isKnown = true
					break
				}
			}
			if (!isKnown && webChannel.channels.size > 1) {
				// webChannel.canClose(c)
				// 	.then((answer) => {
				// 		if (answer) {
				// 			c.close()
							webChannel.channels.delete(c)
				// 		} else {
				// 			webChannel.channels.delete(c)
				// 		}
				// 	})
				// 	.catch((e) => console.log(e))
			}
		}
	}

	/**
	 * Called when a peer is no longer answering to messages in the shuffling algorithm.
	 * For each time the peer that is no longer responding was in the known peers, it has a chance
	 * to duplicate an other known peer to maintain the number of connections in the network.
	 * @param {WebChannel} webChannel - the webChannel that asks if the peer is still present or not
	 * @param {int} peerId - id of the peer that departed
	 */
	onPeerDown(webChannel, peerId) {
		let occur = 0
		let prob
		let duplicateId

		for (let i = 0 ; i < webChannel.knownPeers.length ; i++) {
			if (webChannel.knownPeers[i].peerId === peerId) {
				occur++
				delete webChannel.knownPeers[i]
			}
		}

		prob = 1 / (webChannel.knownPeers.length + occur)

		for (let j = 0 ; j < occur ; j++) {
			if (Math.random() > prob && webChannel.knownPeers.length > occur) {
				while (typeof duplicateId === 'undefined') {
					duplicateId = webChannel.knownPeers[Math.ceil(Math.random() * webChannel.knownPeers.length) - 1]
				}
				webChannel.knownPeers[webChannel.knownPeers.length] = {peerId: duplicateId, peerAge: 0}
			}
		}

		webChannel.knownPeers.sort()
		webChannel.knownPeers.length = webChannel.knownPeers.length - occur
	}

	leave(webChannel) {}
}

export default SprayService
