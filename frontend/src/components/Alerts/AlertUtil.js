import React from 'react'
import { Platform } from 'react-native'
import DeviceItem from 'components/Devices/DeviceItem'

import { InterfaceItem } from 'components/TagItem'

import { Text } from '@gluestack-ui/themed'

export const transformTag = (context, tag, value, supportTags = true) => {
  if (context) {
    let type = 'RecentIP'
    if (value.includes(':')) {
      type = 'MAC'
    } else if (value.includes('.')) {
      //no-op.
    }

    let deviceItem = undefined
    if (tag.startsWith('Device')) {
      deviceItem = context.getDevice(value, type)

      if (deviceItem === undefined) {
        //alert("failed to find " + value + " " + type)
      }
    }

    //translate to string
    if (!supportTags) {
      if (tag.match(/Interface/)) {
        return value
      } else if (tag.match(/IP/)) {
        return deviceItem?.RecentIP || value
      } else if (tag.match(/Device/)) {
        return deviceItem?.Name || value
      }
    }

    if (tag == 'Interface') {
      return <InterfaceItem size="sm" name={value} />
    } else if (tag == 'Device') {
      return <DeviceItem size="sm" show={['Style', 'Name']} item={deviceItem} />
    } else if (tag == 'DeviceIcon') {
      return <DeviceItem size="sm" show={['Style']} item={deviceItem} />
    } else if (tag == 'DeviceName') {
      return <DeviceItem size="sm" show={['Name']} item={deviceItem} />
    } else if (tag == 'DeviceIP') {
      return <DeviceItem size="sm" show={['RecentIP']} item={deviceItem} />
    } else if (tag == 'DeviceMAC') {
      return <DeviceItem size="sm" show={['MAC']} item={deviceItem} />
    }
  }

  return (
    <Text>
      {value}#{tag}
    </Text>
  )
}

// if supportTags=false string is returned, else list of react elements
export const eventTemplate = (
  context,
  template,
  event,
  supportTags = false
) => {
  if (!template || !event) {
    return template
  }

  let elements = []
  let lastIndex = 0

  //const supportTags = Platform.OS == 'web'
  const addElement = (val) => {
    if (supportTags) {
      elements.push(<Text size="sm">{val}</Text>)
    } else {
      elements.push(val)
    }
  }

  template.replace(
    /\{\{([\w\.]+)(?:#(\w+))?\}\}/g,
    (match, path, tag, index) => {
      // Add the text before the match.
      if (index > lastIndex) {
        addElement(template.slice(lastIndex, index))
      }

      if (match.includes('__')) {
        // Disable double underscore matches.
        lastIndex = index + match.length
        return ''
      }

      const levels = path.split('.')
      let currentValue = event
      for (let level of levels) {
        if (currentValue && currentValue[level]) {
          currentValue = currentValue[level]
        } else {
          currentValue = ''
          break
        }
      }

      if (tag) {
        addElement(transformTag(context, tag, currentValue, supportTags))
      } else {
        addElement(currentValue)
      }

      lastIndex = index + match.length
      return ''
    }
  )

  // Add any remaining text after the last match.
  if (lastIndex < template.length) {
    addElement(template.slice(lastIndex))
  }

  if (supportTags) {
    return (
      <>
        {elements.map((element, idx) => (
          <React.Fragment key={idx}>{element}</React.Fragment>
        ))}
      </>
    )
  }

  // return string
  return elements.join('')
}

/*
export const eventTemplateElements = (context, template, event) => {
  return eventTemplate(context, template, event, true)
}

export const eventTemplateString = (context, template, event) => {
  return eventTemplate(context, template, event, false)
}
*/
