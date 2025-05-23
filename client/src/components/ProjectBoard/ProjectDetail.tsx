import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectService, taskService } from '../../services/api';
import AddMemberModal from '../Modals/AddMemberModal';
import './ProjectBoard.scss';

interface User {
    _id: string;
    name: string;
    email: string;
    picture?: string;
}

interface ProjectMember {
    user: User;
    role: 'owner' | 'member' | 'viewer';
    joinedAt: string;
}

interface GithubRepo {
    owner: string;
    name: string;
    fullName: string;
    url: string;
}

interface Project {
    _id: string;
    name: string;
    description: string;
    status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
    startDate: string;
    endDate?: string;
    owner: User;
    members: ProjectMember[];
    githubRepo?: GithubRepo;
    createdAt: string;
    updatedAt: string;
}

interface Task {
    _id: string;
    title: string;
    description?: string;
    status: 'to-do' | 'in-progress' | 'in-review' | 'completed';
    priority: 'low' | 'medium' | 'high';
    project: string;
    assignedTo?: User;
    dueDate?: string;
    completedAt?: string;
    githubIssue?: {
        id: number;
        number: number;
        url: string;
    };
    createdBy: User;
    createdAt: string;
    updatedAt: string;
}

interface ProjectDetailProps {
    projectId: string;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId }) => {
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // State for the modal
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    useEffect(() => {
        const fetchProjectAndTasks = async () => {
            try {
                setLoading(true);

                // Fetch project details
                const projectResponse = await projectService.getProject(projectId);
                setProject(projectResponse.data.data);

                // Fetch project tasks
                const tasksResponse = await taskService.getProjectTasks(projectId);
                setTasks(tasksResponse.data.data);

                setError(null);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load project');
                console.error('Error loading project:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProjectAndTasks();
    }, [projectId]);

    // Add a function to refresh the project after adding a member
    const refreshProject = async () => {
        try {
            const projectResponse = await projectService.getProject(projectId);
            setProject(projectResponse.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to refresh project');
        }
    };

    const handleEditProject = () => {
        navigate(`/projects/${projectId}/edit`);
    };

    const handleAddTask = () => {
        navigate(`/projects/${projectId}/tasks/new`);
    };

    const handleTaskClick = (taskId: string) => {
        navigate(`/projects/${projectId}/tasks/${taskId}`);
    };

    const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
        // Stop event propagation to prevent navigation
        e.stopPropagation();

        if (window.confirm('Are you sure you want to delete this task?')) {
            try {
                await taskService.deleteTask(taskId);

                // Remove the task from the state
                setTasks(prevTasks => prevTasks.filter(task => task._id !== taskId));
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to delete task');
                console.error('Error deleting task:', err);
            }
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatus: 'to-do' | 'in-progress' | 'in-review' | 'completed', e: React.MouseEvent) => {
        // Stop event propagation to prevent navigation
        e.stopPropagation();

        try {
            const task = tasks.find(t => t._id === taskId);
            if (!task) return;

            // Only update if status is different
            if (task.status === newStatus) return;

            // Update task status
            await taskService.updateTask(taskId, { status: newStatus });

            // Update the task in the state
            setTasks(prevTasks =>
                prevTasks.map(t =>
                    t._id === taskId ? { ...t, status: newStatus } : t
                )
            );
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update task status');
            console.error('Error updating task status:', err);
        }
    };

    if (loading) return <div>Loading project...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!project) return <div>Project not found</div>;

    return (
        <div className="project-detail">
            <div className="project-header">
                <div className="project-title">
                    <h1>
                        {project.name}
                        <span className={`status-badge ${project.status}`}>{project.status.replace('-', ' ')}</span>
                    </h1>
                </div>

                <div className="project-actions">
                    <button
                        className="btn-secondary"
                        onClick={handleEditProject}
                    >
                        Edit Project
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleAddTask}
                    >
                        Add Task
                    </button>
                </div>
            </div>

            <div className="project-description">
                <h3>Description</h3>
                <p>{project.description}</p>
            </div>

            <div className="project-dates">
                <div className="date-item">
                    <span className="label">Start Date:</span>
                    <span className="value">{new Date(project.startDate).toLocaleDateString()}</span>
                </div>
                {project.endDate && (
                    <div className="date-item">
                        <span className="label">End Date:</span>
                        <span className="value">{new Date(project.endDate).toLocaleDateString()}</span>
                    </div>
                )}
            </div>

            {project.githubRepo && (
                <div className="github-info section-container">
                    <h3>GitHub Repository</h3>
                    <a
                        href={project.githubRepo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="github-link"
                    >
                        {project.githubRepo.fullName}
                    </a>
                </div>
            )}

            <div className="project-members">
                <h3>
                    Team Members
                    {/* Update the add member button to open the modal */}
                    <button 
                        className="add-member-btn"
                        onClick={() => setShowAddMemberModal(true)}
                    >
                        + Add Member
                    </button>
                </h3>
                <div className="members-list">
                    {project.members.map((member) => (
                        <div key={member.user._id} className="member-item">
                            {member.user.picture ? (
                                <img
                                    src={member.user.picture}
                                    alt={member.user.name}
                                    className="member-avatar"
                                />
                            ) : (
                                <div className="member-avatar-placeholder">
                                    {member.user.name.charAt(0)}
                                </div>
                            )}
                            <div className="member-details">
                                <div className="member-name">{member.user.name}</div>
                                <div className="member-email">{member.user.email}</div>
                            </div>
                            <div className={`member-role ${member.role}`}>{member.role}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="project-tasks">
                <div className="tasks-header">
                    <h3>Tasks</h3>
                    <button
                        className="btn-secondary"
                        onClick={handleAddTask}
                    >
                        Add Task
                    </button>
                </div>

                {tasks.length === 0 ? (
                    <div className="empty-state">
                        <p>No tasks have been created for this project yet.</p>
                        <button
                            className="btn-primary"
                            onClick={handleAddTask}
                        >
                            Create First Task
                        </button>
                    </div>
                ) : (
                    <div className="tasks-container">
                        <div className="task-columns">
                            <div className="task-column">
                                <div className="column-header">To Do</div>
                                <div className="column-tasks">
                                    {tasks
                                        .filter(task => task.status === 'to-do')
                                        .map(task => (
                                            <div
                                                key={task._id}
                                                className={`task-card ${task.priority}`}
                                                onClick={() => handleTaskClick(task._id)}
                                            >
                                                <div className="task-title">{task.title}</div>
                                                {task.description && (
                                                    <div className="task-description">{task.description}</div>
                                                )}
                                                <div className="task-meta">
                                                    <span className={`priority-badge ${task.priority}`}>
                                                        {task.priority}
                                                    </span>
                                                    {task.assignedTo && (
                                                        <div className="assigned-to">
                                                            {task.assignedTo.picture ? (
                                                                <img
                                                                    src={task.assignedTo.picture}
                                                                    alt={task.assignedTo.name}
                                                                    className="assignee-avatar"
                                                                />
                                                            ) : (
                                                                <div className="assignee-initials">
                                                                    {task.assignedTo.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="task-actions">
                                                    <button
                                                        className="btn-success task-action-btn"
                                                        onClick={(e) => handleUpdateTaskStatus(task._id, 'in-progress', e)}
                                                        title="Move to In Progress"
                                                    >
                                                        ▶ Start
                                                    </button>
                                                    <button
                                                        className="btn-danger task-action-btn"
                                                        onClick={(e) => handleDeleteTask(task._id, e)}
                                                        title="Delete Task"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div className="task-column">
                                <div className="column-header">In Progress</div>
                                <div className="column-tasks">
                                    {tasks
                                        .filter(task => task.status === 'in-progress')
                                        .map(task => (
                                            <div
                                                key={task._id}
                                                className={`task-card ${task.priority}`}
                                                onClick={() => handleTaskClick(task._id)}
                                            >
                                                <div className="task-title">{task.title}</div>
                                                {task.description && (
                                                    <div className="task-description">{task.description}</div>
                                                )}
                                                <div className="task-meta">
                                                    <span className={`priority-badge ${task.priority}`}>
                                                        {task.priority}
                                                    </span>
                                                    {task.assignedTo && (
                                                        <div className="assigned-to">
                                                            {task.assignedTo.picture ? (
                                                                <img
                                                                    src={task.assignedTo.picture}
                                                                    alt={task.assignedTo.name}
                                                                    className="assignee-avatar"
                                                                />
                                                            ) : (
                                                                <div className="assignee-initials">
                                                                    {task.assignedTo.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="task-actions">
                                                    <button
                                                        className="btn-success task-action-btn"
                                                        onClick={(e) => handleUpdateTaskStatus(task._id, 'in-review', e)}
                                                        title="Move to Review"
                                                    >
                                                        ✓ Review
                                                    </button>
                                                    <button
                                                        className="btn-danger task-action-btn"
                                                        onClick={(e) => handleDeleteTask(task._id, e)}
                                                        title="Delete Task"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div className="task-column">
                                <div className="column-header">In Review</div>
                                <div className="column-tasks">
                                    {tasks
                                        .filter(task => task.status === 'in-review')
                                        .map(task => (
                                            <div
                                                key={task._id}
                                                className={`task-card ${task.priority}`}
                                                onClick={() => handleTaskClick(task._id)}
                                            >
                                                <div className="task-title">{task.title}</div>
                                                {task.description && (
                                                    <div className="task-description">{task.description}</div>
                                                )}
                                                <div className="task-meta">
                                                    <span className={`priority-badge ${task.priority}`}>
                                                        {task.priority}
                                                    </span>
                                                    {task.assignedTo && (
                                                        <div className="assigned-to">
                                                            {task.assignedTo.picture ? (
                                                                <img
                                                                    src={task.assignedTo.picture}
                                                                    alt={task.assignedTo.name}
                                                                    className="assignee-avatar"
                                                                />
                                                            ) : (
                                                                <div className="assignee-initials">
                                                                    {task.assignedTo.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="task-actions">
                                                    <button
                                                        className="btn-success task-action-btn"
                                                        onClick={(e) => handleUpdateTaskStatus(task._id, 'completed', e)}
                                                        title="Mark as Complete"
                                                    >
                                                        ✓ Complete
                                                    </button>
                                                    <button
                                                        className="btn-danger task-action-btn"
                                                        onClick={(e) => handleDeleteTask(task._id, e)}
                                                        title="Delete Task"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div className="task-column">
                                <div className="column-header">Completed</div>
                                <div className="column-tasks">
                                    {tasks
                                        .filter(task => task.status === 'completed')
                                        .map(task => (
                                            <div
                                                key={task._id}
                                                className={`task-card ${task.priority}`}
                                                onClick={() => handleTaskClick(task._id)}
                                            >
                                                <div className="task-title">{task.title}</div>
                                                {task.description && (
                                                    <div className="task-description">{task.description}</div>
                                                )}
                                                <div className="task-meta">
                                                    <span className={`priority-badge ${task.priority}`}>
                                                        {task.priority}
                                                    </span>
                                                    {task.assignedTo && (
                                                        <div className="assigned-to">
                                                            {task.assignedTo.picture ? (
                                                                <img
                                                                    src={task.assignedTo.picture}
                                                                    alt={task.assignedTo.name}
                                                                    className="assignee-avatar"
                                                                />
                                                            ) : (
                                                                <div className="assignee-initials">
                                                                    {task.assignedTo.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="task-actions">
                                                    <button
                                                        className="btn-success task-action-btn"
                                                        onClick={(e) => handleUpdateTaskStatus(task._id, 'to-do', e)}
                                                        title="Reopen Task"
                                                    >
                                                        ⟲ Reopen
                                                    </button>
                                                    <button
                                                        className="btn-danger task-action-btn"
                                                        onClick={(e) => handleDeleteTask(task._id, e)}
                                                        title="Delete Task"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Render the AddMemberModal when showAddMemberModal is true */}
            {showAddMemberModal && (
                <AddMemberModal
                    projectId={projectId}
                    onClose={() => setShowAddMemberModal(false)}
                    onMemberAdded={refreshProject}
                />
            )}
        </div>
    );
};

export default ProjectDetail;