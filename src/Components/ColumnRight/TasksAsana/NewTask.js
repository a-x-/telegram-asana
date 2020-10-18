import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import TasksStore from '../../../Stores/TaskTrackerStore';

import { FormControl, IconButton, TextField, Box, Button, MenuItem, Chip, CircularProgress, Typography, Link } from "@material-ui/core";
import ArrowBackIcon from '../../../Assets/Icons/Back';
import { KeyboardDatePicker } from '@material-ui/pickers';
import { add, formatISO, startOfDay } from 'date-fns'
import { startOfWeek } from 'date-fns/esm';
import { debounce } from '../../../Utils/Common';

const initialTask = {
  name: '',
  assignee: '',
  due_on: null,
  notes: '',
}
const titles = {
  name: 'Task name',
  assignee: 'Assignee',
  due_on: 'Deadline',
  notes: 'Description',
}

export default function NewTask ({ chatId, onClose }) {
    const [{ projects, chats, users: _users, getTaskPlaces, getTasks }] = useState(TasksStore);
    const projectId = chats && chatId && chats[chatId] && chats[chatId].tasksStore.projectId
    const [submitStatus, setSubmitStatus] = useState(null);
    const users = useMemo(() => [{id:'me', name: 'Me'}, ..._users], [_users]);
    const [fields, setFields] = useState(() => getInitialFields(projectId))
    const { t } = useTranslation();
    const refs = useRef({})
    const [taskPlaces, setTaskPlaces] = useState([])
    const [tasks, setTasks] = useState([])
    const superTask = useMemo(() => taskPlaces[0] && tasks.find(t => t.id === taskPlaces[0].superTaskId), [taskPlaces, tasks])
    const persistFields = useCallback(debounce((_fields) => void setTimeout(() => {
      const fields = { ..._fields, due_on: _fields.due_on && formatISO(_fields.due_on, { representation: 'date'})}
      console.log('save fields', fields, 'to', projectId)
      localStorage[`taskTrackerIncomplete_${projectId}`] = JSON.stringify(fields)
    }),600), [])

    useEffect(() => void (projectId && getTasks(projectId).then(setTasks)), [projectId]);
    useEffect(() => void (projectId && getTaskPlaces(projectId).then(setTaskPlaces)), [projectId]);
    useEffect(() => void persistFields(fields), [fields])

    if (!chats || !chats[chatId] || !chats[chatId].tasksStore) return null

    return <div className='chat-tasks-new-form'>
        <div className='header-master'>
            <IconButton className='header-left-button' onClick={onClose}>
                <ArrowBackIcon />
            </IconButton>
            <div className='header-status grow'>
                <span className='header-status-content'>{t('New task')}</span>
            </div>
        </div>

        <div className='chat-tasks-new-form-controls'>
            <FormControl fullWidth variant='outlined'>
                <Box p={2}>
                  {taskPlaces&&taskPlaces.length <= 1
                    ? <Typography variant='caption' style={{ color: 'grey'}}>
                        {taskPlaces[0] && superTask
                          ? <Link color="inherit" underline="none" href={`https://app.asana.com/0/${projectId}/${superTask.id}`} target="_blank" rel="noopener noreferrer">
                            {superTask.name} ❯
                          </Link>
                          : <i>Loading task place...</i>
                        }
                      </Typography>
                    : (
                      <span>((тут будет выбор одного концерта из нескольких доступных))</span>
                      // <TextField select {...getFieldProps('superTask', {targetValue: true})} style={{ marginBottom: 8 }}>
                      //   {users && users.map(user => <MenuItem key={user.id} value={user.id}>{ user.name }</MenuItem>)}
                      // </TextField>
                  )}
                </Box>
                <Box p={2}>
                  <TextField {...getFieldProps('name')} autoFocus />
                </Box>
                <Box p={2}>
                  <TextField select {...getFieldProps('assignee', {targetValue: true})} style={{ marginBottom: 8 }}>
                    {users && users.map(user => <MenuItem key={user.id} value={user.id}>{ user.name }</MenuItem>)}
                  </TextField>
                  <Chip onClick={ () => setFields(fields => ({ ...fields, assignee: 'me' })) } label={t('Me')}/>
                </Box>
                <Box p={2}>
                  <KeyboardDatePicker autoOk disablePast format="dd.MM.yyyy"
                    style={{ marginBottom: 8 }}
                    {...getFieldProps('due_on', {targetValue: null})}
                    variant="inline"
                  />

                  <div style={{ display: 'flex' }}>
                    <Chip onClick={ () => setFields(fields => ({ ...fields, due_on: startOfDay(add(new Date(), { days: 1 })) })) } label={t('Tomorrow')}/>
                    <Chip onClick={ () => setFields(fields => ({ ...fields, due_on: startOfDay(add(new Date(), { weeks: 1 })) })) } label={t('In a Week')} style={{ marginLeft: 8 }}/>
                    <Chip onClick={ () => setFields(fields => ({ ...fields, due_on: add(startOfWeek(new Date(), {weekStartsOn: 1}), { weeks: 1 }) })) } label={t('Monday')} style={{ marginLeft: 8 }}/>
                  </div>
                </Box>
                <Box p={2}>
                  <TextField {...getFieldProps('notes')} rows={16} multiline />
                </Box>
            </FormControl>

            <Box p={2} style={{ display: 'flex', alignItems: 'center' }}>
              <Button variant="contained" color="primary" onClick={submitStatus === 'loading' ? undefined : handleSubmit} style={{ color: 'white' }}>
                {submitStatus === 'loading' ? <CircularProgress size={24} style={{ color: 'white' }} /> : t('Create')}
              </Button>
              { submitStatus instanceof Error && <div style={{ marginLeft: 16, color: 'red', fontWeight: 500 }}>{ submitStatus.toString() }</div> }
            </Box>
        </div>
    </div>

  /**
   * @returns {import('@material-ui/core').OutlinedTextFieldProps}
   */
  function getFieldProps(field, {targetValue = false} = {}) {
    return {
      variant: 'outlined',
      // @ts-ignore
      inputVariant: 'outlined',
      fullWidth: true,
      value: fields[field],
      label: t(titles[field]),
      inputRef: (ref) => refs.current[field] = ref,
      onChange:
        (targetValue === true && ((e) => setFields(fields => ({...fields, [field]: e.target.value })))) ||
        // Тут какой-то сломаный MUI, в котором не работает e.target.value... Пиздец блядь
        (targetValue === false && (() => setFields(fields => ({...fields, [field]: refs.current[field] && refs.current[field].value })))) ||
        ((value) => setFields(fields => ({...fields, [field]: value })))

    }
  }

  async function handleSubmit () {
    if (!chats || !chats[chatId] || !chats[chatId].tasksStore) return alert('Не подтянулась инфа из асаны')
    const {projectId} = chats[chatId].tasksStore

    const due_on = fields.due_on && formatISO(fields.due_on, { representation: 'date'});
    try {
      setSubmitStatus('loading')
      await TasksStore.submitTask(projectId, {...fields, due_on, parent: superTask && superTask.id})
      setFields(initialTask)
      setSubmitStatus(null)
    } catch(e) {
      setSubmitStatus(e)
    }
    // todo: close
  }
}

function getInitialFields(projectId) {
  if (localStorage[`taskTrackerIncomplete_${projectId}`]) {
    const res = JSON.parse(localStorage[`taskTrackerIncomplete_${projectId}`])
    return {...res, due_on: res.due_on && new Date(res.due_on)}
  } else {
    return initialTask
  }
}
