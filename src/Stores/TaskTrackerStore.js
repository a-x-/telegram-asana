import EventEmitter from './EventEmitter';

const ORG1_CHAT_ID = 203483732;
const ORG1_PRJ_ID = '1144484093750372';
export const TT = {
  ASANA: 'ASANA',
}
export const initialTasks = []
export const initialProjects = {
  ORG1_PRJ_ID: {},
}
export const initialChats = {
  [ORG1_CHAT_ID]: {
    tasksStore: {
      projectId: ORG1_PRJ_ID,
      taskTracker: TT.ASANA
    },
  },
}
const asanaHeaders = new Headers({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.REACT_APP_ASANA_TOKEN}`,
})


class TaskTrackerStore extends EventEmitter {
  constructor() {
      super();
      this.reset();
      setTimeout(() => {
        this.loadProjects();
        this.loadUsers();
      }, 1000); // low priority
  }
  reset() {
    this.projects = initialProjects;
    this.chats = initialChats;
    this.users = [];
  }
  async loadProjects() {
    const {data: projects} = await fetch('https://app.asana.com/api/1.0/projects', { headers: asanaHeaders }).then(r => r.json())
    this.projects = projects.map((item) => ({...item, id: item.gid}));
    // todo: error,loading
  }
  async loadUsers() {
    const {data: users} = await fetch('https://app.asana.com/api/1.0/users', { headers: asanaHeaders }).then(r => r.json())
    this.users = users.map((item) => ({...item, id: item.gid}));
    // todo: error,loading
  }

  //
  // == Public

  /**
   * @param projectId {number}
   * @param data {object}
   */
  submitTask = async (projectId, data) => {
    const params = { method: 'POST', headers: asanaHeaders, body: JSON.stringify({data: {...data, projects: [projectId]}}) };
    const res = await fetch('https://app.asana.com/api/1.0/tasks', params).then(res => res.json());
    if (res.errors) throw new Error(res.errors[0] && res.errors[0].message || 'Error');
  }
}

const store = new TaskTrackerStore();
window.tasksStore = store;
export default store;
