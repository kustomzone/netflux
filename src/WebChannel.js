import {provide, FULLY_CONNECTED, SPRAY, WEBRTC, WEBSOCKET, MESSAGE_BUILDER} from 'serviceProvider'
import Channel from 'Channel'
import JoiningPeer from 'JoiningPeer'
import WebChannelGate from 'WebChannelGate'

const msgBld = provide(MESSAGE_BUILDER)

/**
 * Maximum identifier number for {@link WebChannel#generateId} function.
 * @type {number}
 */
const MAX_ID = 4294967295

/**
 * Timeout for ping *WebChannel* in milliseconds.
 * @type {number}
 */
const PING_TIMEOUT = 5000

/**
 * Timeout for the peer to answer when trying to know if it is reachable in milliseconds.
 * @type {number}
 */
const PEER_REACHABLE_TIMEOUT = 1000

const CAN_CLOSE_TIMEOUT = 3000

/**
 * One of the internal message type. It's a peer message.
 * @type {number}
 */
const USER_DATA = 1

/**
 * One of the internal message type. This message should be threated by a
 * specific service class.
 * @type {number}
 */
const SERVICE_DATA = 2

/**
 * One of the internal message type. Means a peer has left the *WebChannel*.
 * @type {number}
 */
const LEAVE = 3

/**
 * One of the internal message type. Initialization message for the joining peer.
 * @type {number}
 */

const JOIN_INIT = 4

/**
 * One of the internal message type. The message is intended for the *WebChannel*
 * members to notify them about the joining peer.
 * @type {number}
 */
const JOIN_NEW_MEMBER = 5

/**
 * One of the internal message type. The message is intended for the *WebChannel*
 * members to notify them that the joining peer has not succeed.
 * @type {number}
 */
const REMOVE_NEW_MEMBER = 6

/**
 * One of the internal message type. The message is intended for the joining peer
 * to notify him that everything is ready and he may join the *WebChannel*.
 * @type {number}
 */
const JOIN_FINILIZE = 7

/**
 * One of the internal message type. The message sent by the joining peer to
 * notify all *WebChannel* members about his arrivel.
 * @type {number}
 */
const JOIN_SUCCESS = 8

// /**
//  * One of the internal message type. This message is sent during Initialization
//  * of a channel.
//  * @see {@link WebChannel#initChannel}
//  * @type {number}
//  */
// const INIT_CHANNEL_PONG = 10

const INIT_OK = 10

/**
 * One of the internal message type. Ping message.
 * @type {number}
 */
const PING = 11

/**
 * One of the internal message type. Pong message, response to the ping message.
 * @type {number}
 */
const PONG = 12

/**
 * One of the internal message type. This message is sent when shuffling the known
 * peers in Spray algorithm.
 * @type {number}
 */
const SHUFFLE = 13

/**
 * One of the internal message type. This message is sent when answering a shuffling
 * message in Spray algorithm.
 * @type {number}
 */
const SHUFFLE_ANSWER = 14

/**
 * One of the internal message type. This message is sent when a peer send a message to another
 * peer which is not in its knownPeers, so that an intermediary peer will forward the message.
 * @type {number}
 */
const FORWARD_MESSAGE = 15

/**
 * One of the internal message type. This message is sent when broadcasting in the Spray topology.
 * @type {number}
 */
const BROADCAST = 16

/**
 * One of the internal message type. This message is sent when a peer wants to know if
 * an other peer is reachable or not in the Spray topology.
 * @type {number}
 */
const IS_PEER_REACHABLE = 17

/**
 * One of the internal message type. This message is sent when answering a IS_PEER_REACHABLE
 * message
 * @type {number}
 */
const PEER_REACHABLE = 18

const CAN_CLOSE = 19

const DO_CLOSE = 20

const DONT_CLOSE = 21

/**
 * Constant used to send a message to the server in order that
 * he can join the webcahnnel
 * @type {string}
 */
const ADD_BOT_SERVER = 'addBotServer'

/**
 * This class is an API starting point. It represents a group of collaborators
 * also called peers. Each peer can send/receive broadcast as well as personal
 * messages. Every peer in the *WebChannel* can invite another person to join
 * the *WebChannel* and he also possess enough information to be able to add it
 * preserving the current *WebChannel* structure (network topology).
 */
class WebChannel {

  /**
   * When the *WebChannel* is open, any clients should you this data to join
   * the *WebChannel*.
   * @typedef {Object} WebChannel~AccessData
   * @property {string} key - The unique key to join the *WebChannel*
   * @property {string} url - Signaling server url
   */

  /**
   * *WebChannel* constructor. *WebChannel* can be parameterized in terms of
   * network topology and connector technology (WebRTC or WebSocket. Currently
   * WebRTC is only available).
   * @param  {Object} [options] *WebChannel* configuration.
   * @param  {string} [options.topology=FULLY_CONNECTED] Defines the network
   *            topology.
   * @param  {string} [options.connector=WEBRTC] Determines the connection
   *            technology to use for build *WebChannel*.
   * @returns {WebChannel} Empty *WebChannel* without any connection.
   */
  constructor (options = {}) {
    this.defaults = {
      connector: WEBRTC,
      topology: FULLY_CONNECTED,
      signaling: 'wss://sigver-coastteam.rhcloud.com:8443'
    }
    this.settings = Object.assign({}, this.defaults, options)

    /**
     * Channels through which this peer is connected with other peers. This
     * attribute depends on the *WebChannel* topology. E. g. in fully connected
     * *WebChannel* you are connected to each other peer in the group, however
     * in the star structure this attribute contains only the connection to
     * the central peer.
     * @private
     * @type {external:Set}
     */
    this.channels = new Set()

    /**
     * Array containing all the knownPeers of this webChannel in the Spray
     * topology.
     * @type {array}
     */ 
    this.knownPeers = []

    /**
     * Array containing all the message broadcasted by this channel.
     * @type {array}
     */
    this.broadcastedMsg = []

    /**
     * Array containing all the functions needed to resolve the promises in
     * isPeerReachable().
     * @type {array}
     */
    this.isPeerReachableArray = []

    this.canCloseArray = []

    /**
     * This event handler is used to resolve *Promise* in {@link WebChannel#join}.
     * @private
     */
     // TODO: add type to doc
    this.onJoin

    /**
     * Set of joining peers.
     * @private
     * @type {external:Set}
     */
    this.joiningPeers = new Set()

    /**
     * *WebChannel* topology.
     * @private
     * @type {string}
     */
    this.topology = this.settings.topology

    /**
     * Total peer number in the *WebChannel*.
     * @private
     * @type {number}
     */
    this.peerNb = 0

    /**
     * @private
     * @type {number}
     */
    this.pingTime = 0

    /**
     * The *WebChannel* gate.
     * @private
     * @type {WebChannelGate}
     */
    this.gate = new WebChannelGate((closeEvt) => this.onClose(closeEvt))

    /**
     * Unique identifier of this *WebChannel*. The same for all peers.
     * @readonly
     */
    this.id = this.generateId()

    /**
     * Unique peer identifier of you in this *WebChannel*. After each `join` function call
     * this id will change, because it is up to the *WebChannel* to assign it when
     * you join.
     * @readonly
     */
    this.myId = this.generateId()

    /**
     * Is the event handler called when a new peer has  joined the *WebChannel*.
     * @param {number} id - Id of the joined peer
     */
    this.onJoining = (id) => {}

    /**
     * Is the event handler called when a message is available on the *WebChannel*.
     * @param {number} id - Id of the peer who sent this message
     * @param {string|external:ArrayBufferView} data - Message
     * @param {boolean} isBroadcast - It is true if the message is sent via
     * [send]{@link WebChannel#send} method and false if it is sent via
     * [sendTo]{@link WebChannel#sendTo} method
     */
    this.onMessage = (id, msg, isBroadcast) => {}

    /**
     * Is the event handler called when a peer hes left the *WebChannel*.
     * @param {number} id - Id of the peer who has left
     */
    this.onLeaving = (id) => {}

    /**
     * Is the event handler called when the *WebChannel* has been closed.
     * @param {external:CloseEvent} id - Close event object
     */
    this.onClose = (closeEvt) => {}
  }

  /**
   * Enable other peers to join the *WebChannel* with your help as an
   * intermediary peer.
   * @param  {Object} [options] Any available connection service options
   * @returns {Promise} It is resolved once the *WebChannel* is open. The
   * callback function take a parameter of type {@link WebChannel~AccessData}.
   */
  open (options = {}) {
    let settings = Object.assign({}, this.settings, options)
    return this.gate.open((channel) => {
      this.initChannel(channel)
        .then((channel) => this.addChannel(channel))
    }, settings)
  }

  /**
    * Add a channel to the current peer network according to the topology
    *
    * @param {Object} channel - Channel which needs to be add in the topology
    * @return {Promise} It resolves once the channel is add
    */
  addChannel (channel) {
    let jp = this.addJoiningPeer(channel.peerId, this.myId, channel)
    if (this.topology === FULLY_CONNECTED) {
      this.manager.broadcast(this, msgBld.msg(JOIN_NEW_MEMBER, {newId: channel.peerId}))
    } else if (this.topology === SPRAY) {
      for (let i = 0 ; i < this.knownPeers.length ; i++) {
        this.manager.sendTo(this.knownPeers[i].peerId, this, msgBld.msg(JOIN_NEW_MEMBER, {newId: channel.peerId}))
      }
    }
    channel.send(msgBld.msg(JOIN_INIT, {
      manager: this.settings.topology,
      wcId: this.id
    }, channel.peerId))
    return this.manager.add(channel)
      .then(() => {
        channel.send(msgBld.msg(JOIN_FINILIZE))
      })
      .catch((msg) => {
        if (this.topology === FULLY_CONNECTED) {
          this.manager.broadcast(this, msgBld.msg(REMOVE_NEW_MEMBER, {id: channel.peerId}))
        } else if (this.topology === SPRAY) {
          for (let i = 0 ; i < this.knownPeers.length ; i++) {
            this.manager.sendTo(this.knownPeers[i].peerId, this, msgBld.msg(REMOVE_NEW_MEMBER, {id: channel.peerId}))
          }
        }
        this.removeJoiningPeer(jp.id)
      })
  }

  /**
    * Add a bot server to the network with his hostname and port
    *
    * @param {string} host - The hotname or the ip of the bot server to be add
    * @param {number} port - The port of the bot server to be add
    * @return {Promise} It resolves once the bot server joined the network
    */
  addBotServer (host, port) {
    return new Promise((resolve, reject) => {
      let cBuilder = provide(WEBSOCKET, {host, port, addBotServer: true})
      let url = 'ws://' + host + ':' + port
      cBuilder.connect(url).then((socket) => {
        /*
          Once the connection open a message is sent to the server in order
          that he can join initiate the channel
        */
        socket.send(JSON.stringify({code: ADD_BOT_SERVER, sender: this.myId, wcId: this.id}))
        this.initChannel(socket)
          .then((channel) => this.addChannel(channel))
          .then(() => resolve())
      }).catch((reason) => {
        reject(reason)
      })
    })
  }

  /**
    * Allow a bot server to join the network by creating a connection
    * with the peer who asked his coming
    *
    * @param {Object} channel - The channel between the server and the pair
    * who requested the add
    * @param {number} id - The id of the peer who requested the add
    * @return {Promise} It resolves once the the server has joined the network
    */
  joinAsBot (channel, id) {
    return new Promise((resolve, reject) => {
      this.onJoin = () => resolve(this)
      this.initChannel(channel, id)// .then((channel) => {
        // console.log('[DEBUG] Resolved initChannel by server')
      // })
    })
  }

  /**
   * Prevent clients to join the `WebChannel` even if they possesses a key.
   */
  close () {
    this.gate.close()
  }

  /**
   * If the *WebChannel* is open, the clients can join it through you, otherwise
   * it is not possible.
   * @returns {boolean} True if the *WebChannel* is open, false otherwise
   */
  isOpen () {
    return this.gate.isOpen()
  }

  /**
   * Get the data which should be provided to all clients who must join
   * the *WebChannel*. It is the same data which
   * {@link WebChannel#openForJoining} callback function provides.
   * @returns {WebChannel~AccessData|null} - Data to join the *WebChannel*
   * or null is the *WebChannel* is closed
   */
  getAccess () {
    return this.gate.accessData
  }

  /**
   * Join the *WebChannel*.
   * @param  {string} key - The key provided by one of the *WebChannel* members.
   * @param  {type} [options] - Any available connection service options.
   * @returns {Promise} It resolves once you became a *WebChannel* member.
   */
  join (key, options = {}) {
    let settings = Object.assign({}, this.settings, options)
    let webSocketService = provide(WEBSOCKET)
    let webRTCService = provide(this.settings.connector)
    return new Promise((resolve, reject) => {
      this.onJoin = () => resolve(this)
      webSocketService.connect(settings.signaling)
        .then((ws) => {
          ws.onclose = (closeEvt) => reject(closeEvt.reason)
          ws.onerror = (error) => reject(error.reason)
          return webRTCService.connectOverSignaling(ws, key)
            .then((channel) => this.initChannel(channel))
        })
        .catch(reject)
    })
  }

  /**
   * Leave the *WebChannel*. No longer can receive and send messages to the group.
   */
  leave () {
    if (this.channels.size !== 0) {
      if (this.topology === FULLY_CONNECTED) {
        this.manager.broadcast(this, msgBld.msg(LEAVE))
      } else if (this.topology === SPRAY) {
        this.channels.forEach((c) => {
          c.close()
        })
      }
      // this.manager.broadcast(this, msgBld.msg(BROADCAST, msgBld.msg(LEAVE)))
      this.topology = this.settings.topology
      // this.channels.forEach((c) => {
      //   c.close()
      // })
      this.channels.clear()
      // this.joiningPeers.clear()
      this.gate.close()
    }
  }

  /**
   * Send the message to all *WebChannel* members.
   * @param  {string|external:ArrayBufferView} data - Message
   */
  send (data) {
    if (this.channels.size !== 0) {
      msgBld.handleUserMessage(data, null, (dataChunk) => {
        if (this.topology === FULLY_CONNECTED) {
          this.manager.broadcast(this, dataChunk)
        } else if (this.topology === SPRAY) {
          let header = msgBld.readHeader(dataChunk)
          header.senderId = this.myId
          msgBld.readUserMessage(this.id, header.senderId, dataChunk, (fullData, isBroadcast) => {
            this.manager.broadcast(
              this, 
              msgBld.msg(
                BROADCAST, 
                Object.assign({}, {fullData}, {initialHeader: header})
              ), 
              {
                header: {code: BROADCAST, senderId: this.myId, recepientId: 0}, 
                data: {fullData, initialHeader: header}
              })
          })
        }
      })
    }
  }

  /**
   * Send the message to a particular peer in the *WebChannel*.
   * @param  {number} id - Id of the recipient peer
   * @param  {string|external:ArrayBufferView} data - Message
   */
  sendTo (id, data) {
    if (this.channels.size !== 0) {
      msgBld.handleUserMessage(data, id, (dataChunk) => {
        this.manager.sendTo(id, this, dataChunk)
      }, false)
    }
  }

  /**
   * Send the message to a particular peer in the *WebChannel* with
   * the SHUFFLE code in header.
   * @param  {number} id - Id of the recipient peer
   * @param  {} data - Message
   */
  sendToPeerForShuffle (id, data) {
    if (this.channels.size !== 0) {
      let mes = msgBld.msg(SHUFFLE, data, id)
      this.manager.sendTo(id, this, mes)
    }
  }

  /**
   * Send the message to a particular peer in the *WebChannel* with
   * the SHUFFLE_ANSWER code in header.
   * @param  {number} id - Id of the recipient peer
   * @param  {} data - Message
   */
  sendToPeerForShuffleAnswer (id, sample) {
    if (this.channels.size !== 0) {
      let mes = msgBld.msg(SHUFFLE_ANSWER, sample, id)
      this.manager.sendTo(id, this, mes)
    }
  }

  /**
   * Send the message to an intermediary peer in the *WebChannel* with
   * the FORWARD_MESSAGE code in header so that it will forward the message
   * to the final peer or to an other peer if it doesnt know the final peer.
   * @param  {int} destId - Id of the final recipient peer
   * @param  {string|external:ArrayBufferView} data - Message
   * @param  {int} interId - Id of the intermediary peer that must forward the message
   */
  forwardMsg(destId, data, interId) {
    // console.log('forwarded data :', data, 'to', destId, 'by', interId, 'me:', this.myId, 'KP:', this.knownPeers)
    // if the case where wc sends to itself exists, it is a bug
    // if (interId === this.myId) {
    //   this.manager.sendTo(destId, this, data)
    // } else 
    if (this.channels.size !== 0) {
      let header = msgBld.readHeader(data)
      let code = header.code
      let receivedMsg
      let toSend

      try {
        receivedMsg = msgBld.readInternalMessage(data)
        toSend = {data: receivedMsg, code, destId}
        let mes = msgBld.msg(FORWARD_MESSAGE, toSend, destId)
        this.manager.sendTo(interId, this, mes)
      } catch (e) {
        msgBld.readUserMessage(this.id, header.senderId, data, (fullData, isBroadcast) => {
          let toSend = {data: fullData, code, destId}
          let mes = msgBld.msg(FORWARD_MESSAGE, toSend, destId)
          this.manager.sendTo(interId, this, mes)
        })
      }
    }
  }

  /**
   * Check if the peer with peerId is reachable. If it is, the promise is resolved when
   * the peer answers to the message, otherwise it rejects.
   * @param {int} peerId - id of the peer to check
   * @returns {Promise}
   */
  isPeerReachable(peerId) {
    return new Promise ((resolve, reject) => {
      try {
        this.isPeerReachableArray[this.isPeerReachableArray.length] = resolve
        this.manager.sendTo(peerId, this, msgBld.msg(IS_PEER_REACHABLE, {index: this.isPeerReachableArray.length - 1}))
        setTimeout(() => reject('PEER_REACHABLE_TIMEOUT reached'), PEER_REACHABLE_TIMEOUT)
      } catch (e) {
        reject(e)
      }
    })
  }

  canClose(peerId) {
    return new Promise ((resolve, reject) => {
      try {
        this.canCloseArray[this.canCloseArray.length] = resolve
        this.manager.sendTo(peerId, this, msgBld.msg(CAN_CLOSE, {index: this.canCloseArray.length - 1}))
        setTimeout(() => reject('CAN_CLOSE_TIMEOUT reached'), CAN_CLOSE_TIMEOUT*10)
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * Get the ping of the *WebChannel*. It is an amount in milliseconds which
   * corresponds to the longest ping to each *WebChannel* member.
   * @returns {Promise}
   */
  ping () {
    return new Promise((resolve, reject) => {
      if (this.pingTime === 0) {
        this.pingTime = Date.now()
        this.maxTime = 0
        this.pongNb = 0
        this.pingFinish = (delay) => { resolve(delay) }
        if (this.topology === FULLY_CONNECTED) {
          this.manager.broadcast(this, msgBld.msg(PING))
        } else if (this.topology === SPRAY) {
          this.manager.broadcast(this, 
            msgBld.msg(BROADCAST, 
              {initialHeader: PING}, 
              {header: 
                {
                  code: PING, 
                  senderId: this.myId, 
                  recepientId: 0
                }, 
                data: {}
              }
            )
          )
        }
        setTimeout(() => { resolve(PING_TIMEOUT) }, PING_TIMEOUT)
      }
    })
  }

  get topology () {
    return this.settings.topology
  }

  /**
   * Send a message to a service of the same peer, joining peer or any peer in
   * the *WebChannel*.
   * @private
   * @param  {string} serviceName - Service name.
   * @param  {string} recepient - Identifier of recepient peer id.
   * @param  {Object} [msg={}] - Message to send.
   */
  sendSrvMsg (serviceName, recepient, msg = {}, channel = null) {
    // console.log('[DEBUG] sendSrvMsg (serviceName, recepient, msg = {}, channel = null) (',
    // serviceName, ', ', recepient, ', ', msg, ', ', channel, ') &&&& myId :', this.myId)
    let fullMsg = msgBld.msg(
      SERVICE_DATA, {serviceName, data: msg},
      recepient
    )
    if (channel !== null) {
      channel.send(fullMsg)
      return
    }
    if (recepient === this.myId) {
      this.onChannelMessage(null, fullMsg)
    } else {
      // If this function caller is a peer who is joining
      if (this.isJoining()) {
        this.getJoiningPeer(this.myId)
          .intermediaryChannel
          .send(fullMsg)
      } else {
        // If the recepient is a joining peer
        if (this.hasJoiningPeer(recepient)) {
          let jp = this.getJoiningPeer(recepient)
          // If I am an intermediary peer for recepient
          if (jp.intermediaryId === this.myId) {
            jp.intermediaryChannel.send(fullMsg)
          // If not, then send this message to the recepient's intermediary peer
          } else {
            this.manager.sendTo(jp.intermediaryId, this, fullMsg)
          }
        // If the recepient is a member of webChannel
        } else {
          // if (this.topology === SPRAY) {
          //   let isKnownPeer = false
          //   for (let i = 0 ; i < this.knownPeers.length ; i++) {
          //     if (this.knownPeers[i].peerId === recepient) {
          //       isKnownPeer = true
          //       break
          //     }
          //   }
          //   if (isKnownPeer) {
          //     console.log('isKnownPeer')
              // console.log(SERVICE_DATA, {serviceName, data: msg}, recepient, msgBld.readHeader(fullMsg))
          //     this.manager.sendTo(recepient, this, fullMsg)
          //   } else {
          //     console.log('isNotKnownPeer')
          //     this.channels.forEach((c) => {
          //       if (c.peerId === recepient) {
          //         c.send(fullMsg)
          //       }
          //     })
          //   }
          // } else if (this.topology === FULLY_CONNECTED) {
            this.manager.sendTo(recepient, this, fullMsg)
          // }
        }
      }
    }
  }

  /**
   * Message event handler (*WebChannel* mediator). All messages arrive here first.
   * @private
   * @param {Channel} channel - The channel the message came from
   * @param {external:ArrayBuffer} data - Message
   */
  onChannelMessage (channel, data) {
    let header = msgBld.readHeader(data)
    // console.log('ON CHANNEL MESSAGE:\n - code=' + header.code + '\n - sender=' + header.senderId + '\n - recepient=' + header.recepientId)
    // console.log('[DEBUG] {onChannelMessage} header: ', header)
    if (header.code === USER_DATA) {
      msgBld.readUserMessage(this.id, header.senderId, data, (fullData, isBroadcast) => {
        this.onMessage(header.senderId, fullData, isBroadcast)
      })
    } else {
      let msg = msgBld.readInternalMessage(data)
      switch (header.code) {
        case LEAVE:
          for (let c of this.channels) {
            if (c.peerId === header.senderId) {
              c.close()
              this.channels.delete(c)
            }
          }
          this.peerNb--
          // this.onLeaving(msg.id)
          break
        case SERVICE_DATA:
          if (this.myId === header.recepientId) {
            provide(msg.serviceName, this.settings).onMessage(this, channel, msg.data)
          } else {
            this.sendSrvMsg(msg.serviceName, header.recepientId, msg.data)
          }
          break
        case JOIN_INIT:
          this.topology = msg.manager
          this.myId = header.recepientId
          this.id = msg.wcId
          channel.peerId = header.senderId
          this.addJoiningPeer(this.myId, header.senderId, channel)
          break
        case JOIN_NEW_MEMBER:
          this.addJoiningPeer(msg.newId, header.senderId)
          break
        case REMOVE_NEW_MEMBER:
          this.removeJoiningPeer(msg.id)
          break
        case JOIN_FINILIZE:
          this.joinSuccess(this.myId)
          if (this.topology === FULLY_CONNECTED) {
            this.manager.broadcast(this, msgBld.msg(JOIN_SUCCESS))
          } else if (this.topology === SPRAY) {
            this.knownPeers[this.knownPeers.length] = {peerId: channel.peerId, peerAge: 0}
            this.knownPeers.forEach((kp) => { 
              if (typeof kp !== 'undefined') { 
                this.manager.sendTo(kp.peerId, this, msgBld.msg(JOIN_SUCCESS, {id: this.myId})) 
              } 
            })
          }
          this.onJoin()
          break
        case JOIN_SUCCESS:
          if (this.topology === FULLY_CONNECTED) {
            this.joinSuccess(header.senderId)
            this.peerNb++
            this.onJoining(header.senderId)
          } else if (this.topology === SPRAY) {
            if (msg.id === header.senderId) {
              this.joinSuccess(header.senderId)
              this.peerNb++
              this.knownPeers.forEach((kp) => { 
                if (typeof kp !== 'undefined') {
                  this.manager.sendTo(kp.peerId, this, msgBld.msg(JOIN_SUCCESS, {id: msg.id})) 
                } 
              })
              this.onJoining(header.senderId)
            } else {
              this.joinSuccess(msg.id)
              this.peerNb++
              this.onJoining(msg.id)
              this.knownPeers[this.knownPeers.length] = {peerId: msg.id, peerAge: 0}
            }
            
          }
          break
        // case INIT_CHANNEL_PONG:
        //   channel.onPong()
        //   delete channel.onPong
        //   break
        case INIT_OK:
          channel.onOk()
          delete channel.onOk
          break
        case PING:
          this.manager.sendTo(header.senderId, this, msgBld.msg(PONG))
          break
        case PONG:
          let now = Date.now()
          this.pongNb++
          this.maxTime = Math.max(this.maxTime, now - this.pingTime)
          if (this.pongNb === this.peerNb) {
            this.pingFinish(this.maxTime)
            this.pingTime = 0
          }
          break
        case SHUFFLE:
          this.manager.onExchange(this, msg.origin, msg.sample)
          break
        case SHUFFLE_ANSWER:
          this.manager.onShuffleEnd(this, msg)
          break
        case FORWARD_MESSAGE:
          if (msg.code === SHUFFLE_ANSWER) {
            if (msg.destId === this.myId) {
              this.manager.onShuffleEnd(this, msg.data)
            } else {
              this.manager.sendTo(msg.destId, this, msgBld.msg(SHUFFLE_ANSWER, msg.data, msg.destId))
            }
          } else if (msg.code === USER_DATA) {
            if (msg.destId !== this.myId) {
              this.sendTo(msg.destId, msg.data)
            } 
          } else if (msg.code === SERVICE_DATA) {
            if (msg.destId !== this.myId) {
              this.manager.sendTo(msg.destId, this, msgBld.msg(SERVICE_DATA, msg.data, msg.destId))
            }
          } else if (msg.code === CAN_CLOSE) {
            throw new Error('The CAN_CLOSE message is not supposed to be forwarded')
          } else if (msg.code === DO_CLOSE) {
            if (msg.destId !== this.myId) {
              this.manager.sendTo(msg.destId, this, msgBld.msg(DO_CLOSE, msg.data, msg.destId))
            }
          } else if (msg.code === DONT_CLOSE) {
            if (msg.destId !== this.myId) {
              this.manager.sendTo(msg.destId, this, msgBld.msg(DONT_CLOSE, msg.data, msg.destId))
            }
          } 
          break
        case BROADCAST:
          msgBld.handleUserMessage(msg.fullData, null, (dataChunk) => {
            msgBld.completeHeader(dataChunk, msg.initialHeader.senderId)
            this.onChannelMessage(channel, dataChunk)
          })
          this.manager.broadcast(
            this, 
            msgBld.msg(BROADCAST, msg), 
            {header: 
              {
                code: header.code, 
                senderId: header.senderId, 
                recepientId: header.recepientId
              }, 
              data: msg
            }
          )
          break
        case IS_PEER_REACHABLE:
          this.manager.sendTo(header.senderId, this, msgBld.msg(PEER_REACHABLE, msg))
          break
        case PEER_REACHABLE:
          this.isPeerReachableArray[msg.index]()
          break
        case CAN_CLOSE:
          let isKnownPeer = false
          this.channels.forEach((c) => {
            if (c.peerId === header.senderId) {
              isKnownPeer = true
            }
          })
          if (isKnownPeer) {
            this.manager.sendTo(header.senderId, this, msgBld.msg(DONT_CLOSE, msg))
          } else {
            this.manager.sendTo(header.senderId, this, msgBld.msg(DO_CLOSE, msg))
          }
          break
        case DO_CLOSE:
          this.canCloseArray[msg.index](true)
          break
        case DONT_CLOSE:
          this.canCloseArray[msg.index](false)
          break
        default:
          throw new Error(`Unknown message type code: "${header.code}"`)
      }
    }
  }

  /**
   * Error event handler for each *Channel* in the *WebChannel*.
   * @private
   * @param {external:Event} evt - Event
   */
  onChannelError (evt) {
    console.error(`RTCDataChannel: ${evt.message}`)
  }

  /**
   * Close event handler for each *Channel* in the *WebChannel*.
   * @private
   * @param {external:CloseEvent} closeEvt - Close event
   */
  onChannelClose (closeEvt, peerId) {
    for (let c of this.channels) {
      if (c.peerId === peerId) {
        c.close()
        this.channels.delete(c)
      }
    }
    this.peerNb--
    this.onLeaving(peerId)
    // console.info(`Channel with ${peerId} has been closed: ${closeEvt.type}`)
  }

  set topology (name) {
    this.settings.topology = name
    this.manager = provide(this.settings.topology)
  }

  /**
   * Initialize channel. The *Channel* object is a facade for *WebSocket* and
   * *RTCDataChannel*.
   * @private
   * @param {external:WebSocket|external:RTCDataChannel} ch - Channel to
   * initialize
   * @param {number} [id] - Assign an id to this channel. It would be generated
   * if not provided
   * @returns {Promise} - Resolved once the channel is initialized on both sides
   */
  initChannel (ch, id = -1) {
    return new Promise((resolve, reject) => {
      if (id === -1) { id = this.generateId() }
      let channel = new Channel(ch, this, id)
      // TODO: treat the case when the 'ping' or 'pong' message has not been received
      channel.config()
      channel.onOk = () => resolve(channel)
      ch.send('ok')
      ch.onmessage = (msgEvt) => {
        if (msgEvt.data === 'ok') {
          channel.config()
          channel.send(msgBld.msg(INIT_OK))
          resolve(channel)
        }
      }
    })
  }

  /**
   * Function to be executed on each peer once the joining peer has joined the
   * *WebChannel*
   * @private
   * @param  {number} id Identifier of the recently joined peer
   */
  joinSuccess (id) {
    let jp = this.getJoiningPeer(id)
    jp.channelsToAdd.forEach((c) => {
      this.channels.add(c)
    })
    // TODO: handle channels which should be closed & removed
    this.joiningPeers.delete(jp)
  }

  /**
   * Get joining peer by his id.
   * @private
   * @throws Will throws an error if the peer could not be found
   * @param  {number} id Peer id
   */
  getJoiningPeer (id) {
    // if (this.myId !== id) {
    //   console.log('Me ' + this.myId + ' is looking for ' + id)
    // }
    for (let jp of this.joiningPeers) {
      if (jp.id === id) {
        return jp
      }
    }
    throw new Error('Peer ' + this.myId + ' could not find the joining peer ' + id)
  }

  /**
   * Get all joining peers.
   * @private
   * @returns {external:Set} - Joining peers
   */
  getJoiningPeers () {
    return this.joiningPeers
  }

  /**
   * Add joining peer.
   * @private
   * @param  {number} jpId - Joining peer id
   * @param  {number} intermediaryId - The id of the peer through whom the
   * joining peer joins the *WebChannel*
   * @param  {Channel} [intermediaryChannel] - Intermediary channel between the
   * joining peer and his intermediary peer
   * @returns {JoiningPeer} - Just added joining peer
   */
  addJoiningPeer (jpId, intermediaryId, intermediaryChannel = null) {
    // if (this.myId !== jpId) {
    //   console.log('Me ' + this.myId + ' is adding: ' + jpId + ' where intermediaryId is ' + intermediaryId + ' and the channel is ' + (intermediaryChannel !== null))
    // }
    let jp = new JoiningPeer(jpId, intermediaryId, intermediaryChannel)
    if (this.hasJoiningPeer(jpId)) {
      throw new Error('Joining peer already exists!')
    }
    this.joiningPeers.add(jp)
    return jp
  }

  /**
   * Remove joining peer from the joining peer list if he exists. It is done when the joining
   * peer finished the joining process succesfully or not.
   * @private
   * @param  {number} jpId - Joining peer id
   */
  removeJoiningPeer (jpId) {
    if (this.hasJoiningPeer(jpId)) {
      this.joiningPeers.delete(this.getJoiningPeer(jpId))
    }
  }

  /**
   * Check whether this peer is about to join the *WebChannel*.
   * @private
   * @returns {boolean} - True if this peer is joining the *WebChannel* and false
   * otherwise
   */
  isJoining () {
    for (let jp of this.joiningPeers) {
      if (jp.id === this.myId) {
        return true
      }
    }
    return false
  }

  /**
   * Verify if this peer knows about specific joining peer.
   * @private
   * @param  {number} jpId - Joining peer id
   * @returns {boolean} - True if the peer is present, false if not.
   */
  hasJoiningPeer (jpId) {
    for (let jp of this.joiningPeers) {
      if (jp.id === jpId) {
        return true
      }
    }
    return false
  }

  /**
   * Generate random id for a *WebChannel* or a new peer.
   * @private
   * @returns {number} - Generated id
   */
  generateId () {
    let id
    do {
      id = Math.ceil(Math.random() * MAX_ID)
      for (let c of this.channels) {
        if (id === c.peerId) continue
      }
      if (this.hasJoiningPeer(id)) continue
      if (id === this.myId) continue
      break
    } while (true)
    return id
  }

  /**
   * Generate a random sample of a size given from the known peers
   * @param {array} partialView - Contains a list of object {peerId, peerAge} which
   * represents the knownPeers
   * @param {number} size - The size of the sample we want to get
   * @returns {array} - The generated sample
   */
  getSample (partialView, size) {
    let indexes = []
    let sample = []
    let index

    while (indexes.length < size) {
      index = Math.ceil(Math.random() * partialView.length) - 1
      if (!indexes.includes(index)) {
        indexes[indexes.length] = index
      }
    }

    for (let i = 0 ; i < size ; i++) {
      sample[i] = partialView[indexes[i]]
    }

    return JSON.parse(JSON.stringify(sample))
  }
}

export default WebChannel
