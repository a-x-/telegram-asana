/*
 * TaskTracker extension settings panel
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation, withTranslation } from 'react-i18next';
import { compose, withRestoreRef, withSaveRef } from '../../Utils/HOC';
import IconButton from '@material-ui/core/IconButton';
import ArrowBackIcon from '../../Assets/Icons/Back';
import './TaskTracker.css';
import { TextField, Link, Box, Typography, ListItem, List } from '@material-ui/core';
import ChatStore from '../../Stores/ChatStore';
import TaskTrackerStore, { normMapping } from '../../Stores/TaskTrackerStore';
import Autocomplete from '@material-ui/lab/Autocomplete';

const placeScriptGuideText = `
// Task Place Compute Script
// Examples. Choose one and customize it!

// find single Placeholder task by name
({tasks}) => {
  const superTaskId = tasks.find(t => t.name === 'Placeholder task').gid
  return [{superTaskId, sectionId: null}]
}

// find single Section
({sections}) => {
  const sectionId = tasks.find(t => t.name === 'Hot tasks section').gid
  return [{superTaskId: null, sectionId}]
}

// static task or section id
[{sectionId: '4646463535'}]

// several place options
[{superTaskId: '4646463535'}, {superTaskId: '6646463599'}]
`;

export default function TaskTracker ({ onClose }) {
    const [initialSettings] = useState(() => localStorage.taskTrackerSettings && JSON.parse(localStorage.taskTrackerSettings))
    const {t} = useTranslation();
    const patRef = useRef();
    const mappingRef = useRef();
    const placeScriptRef = useRef();
    const [mappingText, setMapping] = useState(initialSettings && initialSettings.mappingText || '');
    const [pat, setPat] = useState(initialSettings && initialSettings.pat || '');
    const [placeScript, setPlaceScript] = useState(initialSettings && initialSettings.placeScript || placeScriptGuideText);
    const settings = useMemo(() => ({ pat, mappingText, placeScript }), [pat, mappingText, placeScript]);
    useEffect(() => void (localStorage.taskTrackerSettings = JSON.stringify(settings)), [settings])

    return (
        <>
            <div className='header-master'>
                <IconButton className='header-left-button' onClick={onClose}>
                    <ArrowBackIcon />
                </IconButton>
                <div className='header-status grow cursor-pointer'>
                    <span className='header-status-content'>{t('Task Tracker')} (Asana)</span>
                </div>
            </div>
            <div className='sidebar-page-content' style={{ display: 'flex', flexDirection: 'column' }}>
                <Box p={2}>
                    <TextField label="Asana Token (PAT)" variant="outlined" placeholder="X/XXXXXXXXXXXXXXX:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        helperText={<Link href="https://app.asana.com/-/developer_console" target="_blank" rel="noopener">Obtain PAT</Link>}
                        fullWidth
                        inputRef={patRef}
                        value={pat}
                        onChange={ () => patRef.current && setPat(patRef.current.value) }
                    />
                </Box>
                <Box p={2}>
                    <div style={{ display: 'flex' }}>
                        <Autocomplete options={[...ChatStore.items.entries()].map(([_, item]) => item).filter(item => !mappingText.includes(item.id))}
                            getOptionLabel={item => item.title}
                            renderInput={(params) => <TextField {...params} label={t('Pick Chat')} variant="outlined" />}
                            onChange={(_, value) => setMapping(text => normMapping(`${text}\n${value.id}(${value.title}) `))}
                            getOptionSelected={(item, value) => item.id === value}
                            value={null}
                            style={{ flexBasis: '50%'}}
                        />
                        <Autocomplete options={[...TaskTrackerStore.projects.entries()].map(([_, item]) => item)}
                            getOptionLabel={item => item.name}
                            renderInput={(params) => <TextField {...params} label={t('Pick Project')} variant="outlined" />}
                            onChange={(_, value) => setMapping(text => normMapping(`${text} ${value.id}(${value.name})\n`))}
                            getOptionSelected={(item, value) => item.id === value}
                            value={null}
                            style={{ flexBasis: '50%', marginLeft: 16 }}
                        />
                    </div>

                    <TextField variant="outlined" multiline rows={ 16 } fullWidth
                        label="Mapping: Chat id <-> Project id"
                        placeholder={`chat_id project_id\nchat_id project_id\nchat_id project_id`}
                        style={{marginTop: 16 }}
                        inputProps={{style:{ whiteSpace: 'nowrap', fontSize: 12, lineHeight: 2 }}}
                        inputRef={mappingRef}
                        value={mappingText}
                        onChange={ () => mappingRef.current && setMapping(normMapping(mappingRef.current.value)) }
                    />
                </Box>
                <Box p={2}>
                    <TextField variant="outlined" multiline rows={ 16 } fullWidth
                        label={t('Task Place Compute Script')}
                        style={{marginTop: 16 }}
                        inputProps={{style:{ whiteSpace: 'nowrap' }}}
                        inputRef={placeScriptRef}
                        value={placeScript}
                        onChange={ () => placeScriptRef.current && setPlaceScript(normMapping(placeScriptRef.current.value)) }
                    />
                </Box>
            </div>
        </>
    );
}
