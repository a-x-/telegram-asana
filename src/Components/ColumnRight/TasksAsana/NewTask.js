import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import TaskTrackerStore from '../../../Stores/TaskTrackerStore';

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
    const [{ projects, chats, users, getTaskPlaces, getTasks }] = useState(TaskTrackerStore);
    const projectId = chats && chatId && chats[chatId] && chats[chatId].tasksStore.projectId
    const [submitStatus, setSubmitStatus] = useState(null);
    const [fields, setFields] = useState(() => getInitialFields(projectId))
    const { t } = useTranslation();
    const refs = useRef({})
    const [taskPlaces, setTaskPlaces] = useState(null)
    const [tasks, setTasks] = useState([])
    const superTask = useMemo(() => taskPlaces && taskPlaces[0] && tasks.find(t => t.id === taskPlaces[0].superTaskId), [taskPlaces, tasks])
    const persistFields = useCallback(debounce((_fields) => void setTimeout(() => {
      const fields = { ..._fields, due_on: _fields.due_on && formatISO(_fields.due_on, { representation: 'date'})}
      console.log('save fields', fields, 'to', projectId)
      localStorage[`taskTrackerIncomplete_${projectId}`] = JSON.stringify(fields)
    }),600), [])

    useEffect(() => {
      if (!projectId) return
      getTasks(projectId).then(tasks => {
        setTasks(tasks)
        const places = getTaskPlaces({tasks})
        if (Array.isArray(places)) setTaskPlaces(places)
        else alert(`${t('Task Place Compute Script')} must return array`)
      })
    }, [projectId]);
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
                  {!taskPlaces && (
                    <Typography variant='caption' style={{ color: 'grey'}}><i>Loading task place...</i></Typography>
                  ) ||
                  taskPlaces.length <= 1 && (
                    <Typography variant='caption' style={{ color: 'grey'}}>
                      {
                        superTask
                          ? <Link color="inherit" underline="none" href={`https://app.asana.com/0/${projectId}/${superTask.id}`} target="_blank" rel="noopener noreferrer">
                            {superTask.name} ❯
                          </Link>
                          : <Link color="inherit" underline="none" href={`https://app.asana.com/0/${projectId}`} target="_blank" rel="noopener noreferrer">
                            {t('Project root')} ❯
                          </Link>
                      }
                    </Typography>
                  ) ||
                  (
                    <select onChange={e=> setFields({ parent: e.target.value})} value={fields.parent || ''} style={{ opacity: .6, border: 'none', width: '100%', boxShadow: '0 8px 0 -1px white, 0 9px 0 -1px grey'}}>
                      <option value="">Project root</option>
                      {taskPlaces.map(p => {
                        const name = tasks.find(t => t.id === p.superTaskId).name
                        return <option key={p.id} value={p.superTaskId}>{name}</option>
                      })}
                    </select>
                  )}
                </Box>
                <Box p={2}>
                  <TextField {...getFieldProps('name')} autoFocus />
                </Box>
                <Box p={2}>
                  <TextField select {...getFieldProps('assignee', {targetValue: true})} style={{ marginBottom: 8 }}>
                    <MenuItem value="me"><i>Me</i></MenuItem>
                    {users && users.map(user => <MenuItem key={user.id} value={user.id}>{ user.name }</MenuItem>)}
                    <MenuItem value=""><i>Nobody</i></MenuItem>
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
      await TaskTrackerStore.submitTask(projectId, {...fields, due_on, parent: superTask && superTask.id})
      setFields(initialTask)
      setSubmitStatus(null)
      setTimeout(() => delete localStorage[`taskTrackerIncomplete_${projectId}`])
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
