import { useEffect } from 'react'
import PropTypes from 'prop-types'
import {
  faBan,
  faBroadcastTower,
  faCircleArrowRight,
  faClock,
  faEllipsis,
  faForward,
  faObjectGroup,
  faRepeat,
  faTag,
  faTags
} from '@fortawesome/free-solid-svg-icons'

import { deviceAPI } from 'api'
import { pfwAPI } from 'api/Pfw'
import { numToDays, daysToNum, toCron, parseClient, toOption } from './Utils'

const triggers = [
  {
    title: 'Always',
    cardType: 'trigger',
    description: 'Always run the selected trigger',
    color: 'violet.300',
    icon: faRepeat,
    params: [],
    values: {},
    preSubmit: function () {
      return { Time: { Days: [], Start: '', End: '' }, Condition: '' }
    }
  },
  {
    title: 'Date',
    cardType: 'trigger',
    description: 'Trigger on selected date and time',
    color: 'violet.300',
    icon: faClock,
    params: [
      {
        name: 'days',
        type: PropTypes.array,
        description: 'mon, tue. weekdays, weekend'
      },
      {
        name: 'from',
        type: PropTypes.string,
        format: /^\d{2}:\d{2}$/,
        description: 'starting time. format: HH:MM'
      },
      {
        name: 'to',
        type: PropTypes.string,
        format: /^\d{2}:\d{2}$/,
        description: 'ending time. format: HH:MM'
      }
    ],
    values: {
      days: 'mon,tue,wed',
      from: '10:00',
      to: '11:00'
    },
    getOptions: function (name = 'days') {
      if (name == 'days') {
        let days = [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday'
        ]

        return days.map((label) => {
          return { label, value: label.slice(0, 3).toLowerCase() }
        })
      }

      //NOTE from,to use TimeSelect component
    },
    preSubmit: function () {
      let { days, from, to } = this.values
      //let CronExpr = toCron(days, from, to)
      let Days = new Array(7).fill(0),
        Start = from,
        End = to

      daysToNum(days).map((idx) => (Days[idx] = 1))

      return { Time: { Days, Start, End }, Condition: '' }
    }
  },
  {
    title: 'Incoming GET',
    hidden: true,
    cardType: 'trigger',
    description: 'Trigger this card by sending a GET request',
    color: 'red.400',
    icon: faBroadcastTower,
    params: [{ name: 'event', type: PropTypes.string }]
  }
]

const actions = [
  {
    title: 'Block TCP',
    cardType: 'action',
    description:
      'Block TCP from source address or group to destination address',
    color: 'red.400',
    icon: faBan,
    params: [
      {
        name: 'Protocol',
        hidden: true,
        type: PropTypes.string
      },
      {
        name: 'Client',
        type: PropTypes.string,
        description: 'IP/CIDR or Group'
      },
      { name: 'DstIP', type: PropTypes.string, description: 'IP/CIDR' },
      {
        name: 'DstPort',
        type: PropTypes.string,
        description: 'Dest port, range of ports, or empty for all'
      }
    ],
    values: {
      Protocol: 'tcp',
      Client: '0.0.0.0',
      DstIP: '',
      DstPort: ''
    },
    getOptions: function (name = 'DstPort') {
      if (name == 'DstPort') {
        return [
          { label: 'http', value: '80' },
          { label: 'https', value: '443' },
          { label: 'ssh', value: '22' },
          { label: 'telnet', value: '23' },
          { label: '3000', value: '3000' },
          { label: '8080', value: '8080' }
        ]
      }

      return []
    },
    preSubmit: async function () {
      let Client = await parseClient(this.values.Client)

      return { ...this.values, Client }
    },
    submit: function (data, flow) {
      let isUpdate = flow.index !== undefined

      if (isUpdate) {
        return pfwAPI.updateBlock(data, flow.index)
      }

      return pfwAPI.addBlock(data)
    }
  },
  {
    title: 'Block UDP',
    cardType: 'action',
    description:
      'Block UDP from source address or group to destination address',
    color: 'warning.400',
    icon: faBan,
    params: [
      {
        name: 'Protocol',
        hidden: true,
        type: PropTypes.string
      },
      {
        name: 'Client',
        type: PropTypes.string,
        description: 'IP/CIDR or Group'
      },
      { name: 'DstIP', type: PropTypes.string, description: 'IP/CIDR' },
      {
        name: 'DstPort',
        type: PropTypes.string,
        description: 'Dest port, range of ports, or empty for all'
      }
    ],
    values: {
      Protocol: 'udp',
      Client: '0.0.0.0',
      DstIP: '',
      DstPort: ''
    },
    getOptions: function (name = 'DstPort') {
      if (name == 'DstPort') {
        return [
          { label: 'http', value: '80' },
          { label: 'https', value: '443' },
          { label: 'ssh', value: '22' },
          { label: 'telnet', value: '23' },
          { label: '3000', value: '3000' },
          { label: '8080', value: '8080' }
        ]
      }

      return []
    },
    //NOTE same as TCP
    preSubmit: async function () {
      return { ...this.values, Client: await parseClient(this.values.Client) }
    },
    submit: function (data, flow) {
      let isUpdate = flow.index !== undefined

      if (isUpdate) {
        return pfwAPI.updateBlock(data, flow.index)
      }

      return pfwAPI.addBlock(data)
    }
  },
  {
    title: 'Forward TCP',
    cardType: 'action',
    description:
      'Forward TCP for specified source to destination address and port',
    color: 'emerald.600',
    icon: faCircleArrowRight,
    params: [
      {
        name: 'Protocol',
        hidden: true,
        type: PropTypes.string
      },
      {
        name: 'Client',
        type: PropTypes.string,
        description: 'IP/CIDR or Group'
      },
      { name: 'OriginalDstIP', type: PropTypes.string, description: 'IP/CIDR' },
      {
        name: 'OriginalDstPort',
        type: PropTypes.string,
        description:
          'Original Destination port, range of ports, or empty for all'
      },
      { name: 'DstIP', type: PropTypes.string, description: 'IP/CIDR' },
      {
        name: 'DstPort',
        type: PropTypes.string,
        description: 'New Destination port, range of ports, or empty for all'
      }
    ],
    values: {
      Protocol: 'tcp',
      Client: '0.0.0.0',
      DstPort: '',
      DstIP: '0.0.0.0',
      OriginalDstIP: '0.0.0.0',
      OriginalDstPort: ''
    },
    getOptions: function (name = 'DstPort') {
      if (['DstPort', 'OriginalDstPort'].includes(name)) {
        return [
          { label: 'http', value: '80' },
          { label: 'https', value: '443' },
          { label: 'ssh', value: '22' },
          { label: 'telnet', value: '23' },
          { label: '3000', value: '3000' },
          { label: '8080', value: '8080' }
        ]
      }

      return []
    },
    preSubmit: async function () {
      return { ...this.values, Client: await parseClient(this.values.Client) }
    },
    submit: function (data, flow) {
      let isUpdate = flow.index !== undefined

      if (isUpdate) {
        return pfwAPI.updateForward(data, flow.index)
      }

      return pfwAPI.addForward(data)
    }
  },
  {
    title: 'Forward UDP',
    cardType: 'action',
    description:
      'Forward UDP for specified source to destination address and port',
    color: 'emerald.400',
    icon: faCircleArrowRight,
    params: [
      {
        name: 'Protocol',
        hidden: true,
        type: PropTypes.string
      },
      {
        name: 'Protocol',
        hidden: true,
        type: PropTypes.string
      },
      {
        name: 'Client',
        type: PropTypes.string,
        description: 'IP/CIDR or Group'
      },
      { name: 'OriginalDstIP', type: PropTypes.string, description: 'IP/CIDR' },
      {
        name: 'OriginalDstPort',
        type: PropTypes.string,
        description:
          'Original Destination port, range of ports, or empty for all'
      },
      { name: 'DstIP', type: PropTypes.string, description: 'IP/CIDR' },
      {
        name: 'DstPort',
        type: PropTypes.string,
        description: 'New Destination port, range of ports, or empty for all'
      }
    ],
    values: {
      Protocol: 'udp',
      Client: '0.0.0.0',
      DstIP: '0.0.0.0',
      OriginalDstIP: '',
      OriginalDstPort: '',
      DstPort: ''
    },
    getOptions: function (name = 'DstPort') {
      if (['DstPort', 'OriginalDstPort'].includes(name)) {
        return [
          { label: 'http', value: '80' },
          { label: 'https', value: '443' },
          { label: 'ssh', value: '22' },
          { label: 'telnet', value: '23' },
          { label: '3000', value: '3000' },
          { label: '8080', value: '8080' }
        ]
      }

      return []
    },
    preSubmit: async function () {
      return { ...this.values, Client: await parseClient(this.values.Client) }
    },
    submit: function (data, flow) {
      let isUpdate = flow.index !== undefined

      if (isUpdate) {
        return pfwAPI.updateForward(data, flow.index)
      }

      return pfwAPI.addForward(data)
    }
  },
  {
    title: 'Forward to Site VPN Gateway',
    cardType: 'action',
    description:
      'Forward traffic over a Site VPN',
    color: 'purple.600',
    icon: faForward,
    params: [
      {
        name: 'Client',
        type: PropTypes.string,
        description: 'IP/CIDR or Group'
      },
      { name: 'OriginalDstIP', type: PropTypes.string, description: 'IP/CIDR' },
      {
        name: 'DstInterface',
        type: PropTypes.string,
        description: 'Destination site (ex: site0)'
      },
    ],
    values: {
      Client: '0.0.0.0',
      OriginalDstIP: '0.0.0.0',
      DstInterface: ''
    },
    getOptions: function (name = 'DstInterface') {
      if (name == 'DstInterface') {

        return new Promise((resolve, reject) => {
          //deviceAPI.groups().then((groups) => resolve(groups.map(toOption)))
          pfwAPI.config().then((config) => {
            let s = []
            for (let i = 0; i < config.SiteVPNs.length; i++) {
              s.push({label: "site" + i, value: "site" + i})
            }
            resolve(s)
          })
        })
      }
    },
    preSubmit: async function () {
      return { ...this.values, Client: await parseClient(this.values.Client) }
    },
    submit: function (data, flow) {
      let isUpdate = flow.index !== undefined

      if (isUpdate) {
        return pfwAPI.updateForward(data, flow.index)
      }

      return pfwAPI.addForward(data)
    }
  },
  {
    title: 'Set Device Groups',
    cardType: 'action',
    description: 'A device joins a group only when conditions are met',
    color: 'cyan.500',
    icon: faObjectGroup,
    params: [
      {
        name: 'Client',
        type: PropTypes.string
      },
      {
        name: 'Groups',
        type: PropTypes.array,
        description: 'Groups'
      }
    ],
    values: {
      Client: '',
      Groups: []
    },
    getOptions: function (value = 'Groups') {
      return new Promise((resolve, reject) => {
        deviceAPI.groups().then((groups) => resolve(groups.map(toOption)))
      })
    },
    preSubmit: async function () {
      let Client = await parseClient(this.values.Client)
      return { ...this.values, Client }
    },
    submit: function (data, flow) {
      let isUpdate = flow.index !== undefined
      console.log('submit:', data, flow)

      if (isUpdate) {
        return pfwAPI.updateGroups(data, flow.index)
      }

      return pfwAPI.addGroups(data)
    }
  },
  {
    title: 'Set Device Tags',
    cardType: 'action',
    description: 'Assign device tags when conditions are met',
    color: 'cyan.500',
    icon: faTags,
    params: [
      {
        name: 'Client',
        type: PropTypes.string
      },
      {
        name: 'Tags',
        type: PropTypes.array,
        description: 'Tags'
      }
    ],
    values: {
      Client: '',
      Tags: []
    },
    getOptions: function (value = 'Tags') {
      return new Promise((resolve, reject) => {
        deviceAPI.tags().then((tags) => {
          resolve(tags.map(toOption))
        })
      })
    },
    preSubmit: async function () {
      let Client = ''
      try {
        Client = await parseClient(this.values.Client)
      } catch (err) {
        console.log('parse fail:', err)
      }

      return { ...this.values, Client }
    },
    submit: function (data, flow) {
      let isUpdate = flow.index !== undefined

      if (isUpdate) {
        return pfwAPI.updateTags(data, flow.index)
      }

      return pfwAPI.addTags(data)
    }
  }
]

const getCards = (cardType) => {
  let cards = cardType == 'trigger' ? triggers : actions
  return cards.filter((card) => card.hidden !== true)
}

const getCard = (cardType, title) => {
  return getCards(cardType).find((card) => card.title == title)
}

const FlowCards = [...triggers, ...actions]

export default FlowCards
export { FlowCards, getCards, getCard, toCron, numToDays }
