import { Component } from "react";
import { zoneDescriptions } from "components/Helpers/Api.js";
import {APIErrorContext} from 'layouts/Admin.js';
import {deviceAPI} from "api/Device"
import {
  Button,
  Input,
  UncontrolledTooltip,
} from "reactstrap";
import Select from "react-select";
import TagsInput from 'react-tagsinput';


export default class Device extends Component {

  state = {
    editing: false,
    name: '',
    zones: [],
    tags: []
  }

  async componentDidMount() {

    const setState = (v) => {
      this.setState(v)
    }

    const device = this.props.device;

    this.setState({zones: device.Zones, name: device.Name, tags: device.DeviceTags})
  }

  handleZones = (zones) => {
    zones = [...new Set(zones)]
    this.setState({zones})

    deviceAPI.updateZones(this.props.device.MAC, zones)
      .catch(error => this.context.reportError("[API] updateDevice error: " + error.message))
  }

  handleTags = (tags) => {
    tags = [...new Set(tags)]
    this.setState({tags})

    deviceAPI.updateTags(this.props.device.MAC, tags)
      .catch(error => this.context.reportError("[API] updateDevice error: " + error.message))
  }

  handleName = (e) => {
    //const name = e.target.name
    const name = e.target.value
    this.setState({name})
    let editing = (name != this.props.device.Name)
    this.setState({editing})
  }

  static contextType = APIErrorContext;

  render() {
    const device = this.props.device
    const generatedID = Math.random().toString(36).substr(2, 9)

    let protocolAuth = {sae: 'WPA3', wpa2: 'WPA2'}
    let wifi_type = protocolAuth[device.PSKEntry.Type] || 'N/A'

    const removeDevice = (e) => {
      let id = device.MAC || "pending"

      deviceAPI.deleteDevice(id)
        .then(this.props.notifyChange)
        .catch(error => this.context.reportError("[API] deleteDevice error: " + error.message))
    }

    const saveDevice = async () => {
      if (this.state.name != "") {
        deviceAPI.updateName(this.props.device.MAC, this.state.name)
          .then(this.props.notifyChange)
          .catch(error => this.context.reportError("[API] updateName error: " + error.message))
      }
    }

    const handleKeyPress = (e) => {
      if (e.charCode == 13) {
        this.setState({editing: false})
        saveDevice()
      }
    }

    return (
      <tr>
        <td className="text-center"> {device.MAC} </td>
        <td className="d-none d-md-table-cell"> { device.RecentIP } </td>
        <td>
          <Input type="text" placeholder="Device name" name="name"
            className={this.state.editing ? "border-info" : "border-light" }
            value={this.state.name}
            onChange={this.handleName}
            onKeyPress={handleKeyPress} />
        </td>
        <td> { wifi_type } </td>
        <td>
          <TagsInput
            inputProps={{placeholder:"Add zone"}}
            value={this.state.zones}
            onChange={this.handleZones}
            tagProps={{className: 'react-tagsinput-tag' }}
          />
        </td>
        <td>
          <TagsInput
            inputProps={{placeholder:"Add tag"}}
            value={this.state.tags}
            onChange={this.handleTags}
            tagProps={{className: 'react-tagsinput-tag' }}
          />
        </td>
        <td className="text-right">
          <Button
            className="btn-icon"
            color="danger"
            id={"tooltip" + (generatedID+1)}
            size="sm"
            type="button"
            onClick={removeDevice}
          >
            <i className="fa fa-times" />
          </Button>{" "}
          <UncontrolledTooltip
            delay={0}
            target={"tooltip" + (generatedID+1)}
          >
            Delete
          </UncontrolledTooltip>
        </td>
      </tr>
    )
  }
}
