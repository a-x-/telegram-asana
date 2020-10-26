import React, { useEffect, useState } from 'react';

import { FormControl, Input, InputLabel, Link, MenuItem, Select, TextField, Typography } from '@material-ui/core';
import CheckedIcon from '@material-ui/icons/RadioButtonChecked';
import UncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import LeftIcon from '@material-ui/icons/ArrowBackIosOutlined';
import OpenIcon from '@material-ui/icons/CallMadeOutlined';

import TaskTrackerStore from '../../../Stores/TaskTrackerStore';
import './TaskCard.css';
import { KeyboardDatePicker } from '@material-ui/pickers';
import { useCallbackDebounce } from '../../../Utils/Hooks';
import { asanaHeaders } from '../../../Utils/Api';

export default function TaskCard ({data, onClose, onSendChange, onCompleteToggle}) {
  const [{ users }] = useState(TaskTrackerStore);
  const [description, setDescription] = useState(data.notes);
  const [assignee, setAssignee] = useState(data.assignee && data.assignee.gid);
  const [due, setDue] = useState(data.due_on);
  const sendDescrChange = useCallbackDebounce(_sendDescrChange, 2000, []);

  useEffect(() => setAssignee(data.assignee && data.assignee.gid), [data.assignee && data.assignee.gid]);
  useEffect(() => setDue(data.due_on), [data.due_on]);

  return <div className="tasks-card">
    <div style={{ display: 'flex' }}>
      <div style={{ flexGrow: 1 }}>
        <Typography variant="h6" className="tasks-card-title">
          <span style={{ cursor: 'pointer'}} onClick={ onCompleteToggle }>
            {data.completed ? <CheckedIcon color="inherit" className="task-card-icon"/> : <UncheckedIcon color="inherit" className="task-card-icon"/>}
          </span>
          <span style={{ marginLeft: '.5em' }}>{data.name}</span>
        </Typography>

        <Typography variant="subtitle1" style={{ display: 'flex', alignItems: 'center' }}>
          { renderAssignInput() }
          &nbsp;&nbsp;&nbsp;&nbsp;
          { renderDueInput() }
        </Typography>

        <div className="task-card-description">
          { renderDescriptionInput() }
        </div>
      </div>

      <div className="tasks-card-aside">
        <Link underline="none" target="_blank" rel="noopener noreferrer" onClick={onClose}><LeftIcon color="inherit" style={{ transform: 'rotate(-90deg)'}} /></Link>
        <Link underline="none" target="_blank" rel="noopener noreferrer" href={data.permalink_url}><OpenIcon color="inherit" /></Link>
      </div>
    </div>
  </div>

  function renderAssignInput () {
    return <TextField select value={ assignee } style={{ width: 140 }} onChange={ e => sendAssigneeChange(e.target.value)} label="Assignee">
      <MenuItem value="me"><i>Me</i></MenuItem>
      {users && users.map(user => <MenuItem key={user.id} value={user.id}>{ user.name }</MenuItem>)}
      <MenuItem value=""><i>Nobody</i></MenuItem>
    </TextField>
  }
  function renderDueInput () {
    return <FormControl style={{ height: 48, justifyContent: 'flex-end'}}>
      <KeyboardDatePicker autoOk format="dd.MM.yyyy" placeholder="DD.MM.YYYY" variant="inline" style={{ width: 140 }}
        value={ due || null }
        onChange={ value => sendDueChange(value)}
      />
    </FormControl>
  }

  function renderDescriptionInput () {
    return <Input multiline fullWidth placeholder="Write task details" rows={22}
      value={ description || '' }
      onChange={ (e) => {setDescription(e.target.value); sendDescrChange(e.target.value)} }
    />
  }

  function _sendDescrChange (text) { onSendChange(data.id, 'notes', text); }
  function sendAssigneeChange (value) { setAssignee(value); onSendChange(data.id, 'assignee', value || null); }
  function sendDueChange (value) { setDue(value); onSendChange(data.id, 'due_on', value); }
}
