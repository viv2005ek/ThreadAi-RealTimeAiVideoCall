import { Video, Plus, LogOut, MessageSquare, Trash2, Loader2, Building2, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deleteConversation, updateConversationTitle, updateCompanyName } from '../services/firestore';
import { Conversation, Company } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  companies: Company[];
  activeConversationId: string | null;
  activeCompanyId: string | null;
  onSelectConversation: (id: string | null) => void;
  onSelectCompany: (id: string | null) => void;
  onNewChat: () => void;
  onNewCompany: () => void;
  creatingChat: boolean;
  creatingCompany: boolean;
}

export default function Sidebar({
  conversations,
  companies,
  activeConversationId,
  activeCompanyId,
  onSelectConversation,
  onSelectCompany,
  onNewChat,
  onNewCompany,
  creatingChat,
  creatingCompany
}: SidebarProps) {
  const { currentUser, logout } = useAuth();

  async function handleDelete(e: React.MouseEvent, convId: string) {
    e.stopPropagation();

    try {
      await deleteConversation(convId);
      if (activeConversationId === convId) {
        onSelectConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }

  async function handleRenameConversation(e: React.MouseEvent, convId: string, currentTitle: string) {
    e.stopPropagation();

    const newTitle = prompt('Enter new name:', currentTitle);
    if (newTitle && newTitle.trim() !== currentTitle) {
      try {
        await updateConversationTitle(convId, newTitle.trim());
      } catch (error) {
        console.error('Failed to rename conversation:', error);
        alert('Failed to rename conversation');
      }
    }
  }

  async function handleRenameCompany(e: React.MouseEvent, companyId: string, currentName: string) {
    e.stopPropagation();

    const newName = prompt('Enter new company name:', currentName);
    if (newName && newName.trim() !== currentName) {
      try {
        await updateCompanyName(companyId, newName.trim());
      } catch (error) {
        console.error('Failed to rename company:', error);
        alert('Failed to rename company');
      }
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  return (
    <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-7 h-7 text-gray-800" />
          <span className="text-lg font-bold text-gray-900">Persona Video AI</span>
        </div>

        <div className="space-y-2">
          <button
            onClick={onNewChat}
            disabled={creatingChat}
            className="w-full py-2.5 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creatingChat ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Chat
          </button>

          <button
            onClick={onNewCompany}
            disabled={creatingCompany}
            className="w-full py-2.5 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creatingCompany ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
            Add Company
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
            Chats
          </div>
          {conversations.length === 0 ? (
            <div className="text-center py-4">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No chats yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onSelectCompany(null);
                  }}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    activeConversationId === conv.id && !activeCompanyId
                      ? 'bg-gray-200 text-gray-900'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate text-sm">{conv.title}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => handleRenameConversation(e, conv.id, conv.title)}
                      className="p-1 hover:bg-gray-300 rounded"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="p-1 hover:bg-gray-300 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
            Companies
          </div>
          {companies.length === 0 ? (
            <div className="text-center py-4">
              <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No companies yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => {
                    onSelectCompany(company.id!);
                    onSelectConversation(null);
                  }}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    activeCompanyId === company.id
                      ? 'bg-gray-200 text-gray-900'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate text-sm">{company.name}</span>
                  <button
                    onClick={(e) => handleRenameCompany(e, company.id!, company.name)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 rounded transition-all"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-3 truncate">
          {currentUser?.email}
        </div>
        <button
          onClick={handleLogout}
          className="w-full py-2 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
