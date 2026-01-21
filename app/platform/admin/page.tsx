'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheckIcon, BuildingOfficeIcon, UsersIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { Globe, Save, X, Plus, Rocket, Upload, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Organization, Profile } from '@/types/database.types'

export default function AdminPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isEditingOrg, setIsEditingOrg] = useState(false)
  const [isSavingOrg, setIsSavingOrg] = useState(false)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [editedOrg, setEditedOrg] = useState({
    name: '',
    website: '',
    logo_url: '',
    description: '',
    industry: '',
    size: ''
  })
  const [stats, setStats] = useState({
    totalExperts: 0,
    totalExperiences: 0,
    totalPlaybooks: 0
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  async function checkAdminAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const typedProfile = profileData as unknown as Profile

      if (!typedProfile?.is_admin) {
        router.push('/platform')
        return
      }
      setProfile(typedProfile)
      setIsAdmin(true)

      await loadOrganization(typedProfile.organization_id)
      await loadStats(typedProfile.organization_id)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/platform')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadOrganization(orgId: string | null) {
    if (!orgId) {
      setShowCreateOrg(true)
      return
    }

    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (orgData) {
        const typedOrg = orgData as unknown as Organization
        setOrganization(typedOrg)
        setEditedOrg({
          name: typedOrg.name || '',
          website: typedOrg.website || '',
          logo_url: typedOrg.logo_url || '',
          description: typedOrg.description || '',
          industry: typedOrg.industry || '',
          size: typedOrg.size || ''
        })
      }
    } catch (error) {
      console.error('Error loading organization:', error)
    }
  }

  async function loadStats(orgId: string | null) {
    if (!orgId) return

    try {
      // Get total experts in organization
      const { count: expertsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_expert', true)

      // Get total shared experiences (documents with is_shared = true)
      const { count: experiencesCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('is_shared', true)

      // Get total shared playbooks in organization
      const { count: playbooksCount } = await (supabase as any)
        .from('playbooks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_shared', true)

      setStats({
        totalExperts: expertsCount || 0,
        totalExperiences: experiencesCount || 0,
        totalPlaybooks: playbooksCount || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async (file: File, orgId: string): Promise<string | null> => {
    try {
      setIsUploadingLogo(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${orgId}-${Date.now()}.${fileExt}`
      const filePath = `organization-logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Failed to upload logo')
      return null
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSaveOrganization = async () => {
    if (!organization) return

    setIsSavingOrg(true)
    try {
      let logoUrl = editedOrg.logo_url

      // Upload logo if a new file was selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile, organization.id)
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        }
      }

      const { error } = await supabase
        .from('organizations')
        // @ts-expect-error - Supabase type inference issue
        .update({
          name: editedOrg.name,
          website: editedOrg.website,
          logo_url: logoUrl,
          description: editedOrg.description,
          industry: editedOrg.industry,
          size: editedOrg.size
        })
        .eq('id', organization.id)

      if (error) throw error

      setLogoFile(null)
      setLogoPreview('')
      await loadOrganization(organization.id)
      setIsEditingOrg(false)
    } catch (error) {
      console.error('Error updating organization:', error)
      alert('Failed to update organization')
    } finally {
      setIsSavingOrg(false)
    }
  }

  const handleCreateOrganization = async () => {
    if (!profile || !editedOrg.name.trim()) {
      alert('Organization name is required')
      return
    }

    setIsSavingOrg(true)
    try {
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        // @ts-expect-error - Supabase type inference issue
        .insert({
          name: editedOrg.name,
          website: editedOrg.website,
          description: editedOrg.description,
          industry: editedOrg.industry,
          size: editedOrg.size
        })
        .select()
        .single()

      if (createError) {
        console.error('Create error details:', createError)
        throw createError
      }

      const typedOrg = newOrg as unknown as Organization

      // Update profile with organization_id
      const { error: updateError } = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase type inference issue
        .update({ organization_id: typedOrg.id })
        .eq('id', profile.id)

      if (updateError) {
        console.error('Update error details:', updateError)
        throw updateError
      }

      setOrganization(typedOrg)
      setShowCreateOrg(false)
      setIsEditingOrg(false)

      // Reload profile
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single()

      if (updatedProfile) {
        setProfile(updatedProfile as unknown as Profile)
      }
    } catch (error: any) {
      console.error('Error creating organization:', error)
      const errorMessage = error?.message || 'Failed to create organization'
      alert(`Failed to create organization: ${errorMessage}`)
    } finally {
      setIsSavingOrg(false)
    }
  }

  const handleCancelEdit = () => {
    if (organization) {
      setEditedOrg({
        name: organization.name || '',
        website: organization.website || '',
        logo_url: organization.logo_url || '',
        description: organization.description || '',
        industry: organization.industry || '',
        size: organization.size || ''
      })
    }
    setIsEditingOrg(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheckIcon className="w-10 h-10 text-accent" />
          <h1 className="text-4xl font-semibold text-foreground">Admin Dashboard</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Manage your organization, experts, and view analytics
        </p>
      </div>

      {/* Get Started Guide Card */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 p-6">
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
              <Rocket className="w-6 h-6 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Admin Setup Guide
              </h3>
              <p className="text-muted-foreground mb-4">
                New to Tacivo? Learn how to set up your organization, invite team members, and get started with knowledge capture.
              </p>
              <button
                onClick={() => router.push('/platform/admin/get-started')}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
              >
                View Setup Guide
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <div
          onClick={() => router.push('/platform/experts')}
          className="bg-card rounded-xl border border-border p-6 hover:shadow-md hover:border-accent/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-3">
            <UsersIcon className="w-6 h-6 text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Experts</p>
          </div>
          <p className="text-3xl font-semibold text-foreground">{stats.totalExperts}</p>
        </div>

        <div
          onClick={() => router.push('/platform/experiences')}
          className="bg-card rounded-xl border border-border p-6 hover:shadow-md hover:border-accent/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-3">
            <ChartBarIcon className="w-6 h-6 text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Experiences</p>
          </div>
          <p className="text-3xl font-semibold text-foreground">{stats.totalExperiences}</p>
        </div>

        <div
          onClick={() => router.push('/platform/shared-playbooks')}
          className="bg-card rounded-xl border border-border p-6 hover:shadow-md hover:border-accent/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-3">
            <ChartBarIcon className="w-6 h-6 text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Playbooks</p>
          </div>
          <p className="text-3xl font-semibold text-foreground">{stats.totalPlaybooks}</p>
        </div>

        <div
          onClick={() => router.push('/platform/admin/invitations')}
          className="bg-card rounded-xl border border-border p-6 hover:shadow-md hover:border-accent/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-3">
            <UsersIcon className="w-6 h-6 text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Invitations</p>
          </div>
          <p className="text-sm font-medium text-accent">Manage Invitations →</p>
        </div>
      </div>

      {/* Organization Management */}
      <div className="mb-12">
        <div className="bg-card rounded-xl border border-border p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BuildingOfficeIcon className="w-8 h-8 text-accent" />
              <h2 className="text-2xl font-semibold text-foreground">Organization</h2>
            </div>
            {organization && !isEditingOrg && (
              <button
                onClick={() => setIsEditingOrg(true)}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
              >
                Edit
              </button>
            )}
            {isEditingOrg && (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSavingOrg}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveOrganization}
                  disabled={isSavingOrg}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSavingOrg ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {showCreateOrg ? (
            <div className="space-y-6">
              <p className="text-muted-foreground mb-4">
                Create your organization to get started
              </p>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={editedOrg.name}
                  onChange={(e) => setEditedOrg({ ...editedOrg, name: e.target.value })}
                  placeholder="Acme Inc."
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={editedOrg.website}
                  onChange={(e) => setEditedOrg({ ...editedOrg, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  value={editedOrg.industry}
                  onChange={(e) => setEditedOrg({ ...editedOrg, industry: e.target.value })}
                  placeholder="Technology, Healthcare, Finance..."
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Size
                </label>
                <select
                  value={editedOrg.size}
                  onChange={(e) => setEditedOrg({ ...editedOrg, size: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={editedOrg.description}
                  onChange={(e) => setEditedOrg({ ...editedOrg, description: e.target.value })}
                  placeholder="Tell us about your organization..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>

              <button
                onClick={handleCreateOrganization}
                disabled={isSavingOrg || !editedOrg.name.trim()}
                className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {isSavingOrg ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          ) : organization ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Organization Name
                  </label>
                  {isEditingOrg ? (
                    <input
                      type="text"
                      value={editedOrg.name}
                      onChange={(e) => setEditedOrg({ ...editedOrg, name: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                    />
                  ) : (
                    <p className="text-lg font-medium text-foreground">{organization.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Website
                  </label>
                  {isEditingOrg ? (
                    <input
                      type="url"
                      value={editedOrg.website}
                      onChange={(e) => setEditedOrg({ ...editedOrg, website: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                    />
                  ) : organization.website ? (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      {organization.website}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Not set</p>
                  )}
                </div>
              </div>

              {/* Logo Upload Section - Full Width */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Organization Logo
                </label>
                {isEditingOrg ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      {/* Current or Preview Logo */}
                      <div className="flex-shrink-0">
                        {logoPreview || organization.logo_url ? (
                          <img
                            src={logoPreview || organization.logo_url || ''}
                            alt="Organization logo"
                            className="w-24 h-24 object-contain rounded-lg border border-border bg-muted"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg border border-border bg-muted flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Upload Button */}
                      <div className="flex-1">
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          {logoPreview || organization.logo_url ? 'Change Logo' : 'Upload Logo'}
                        </label>
                        <p className="text-xs text-muted-foreground mt-2">
                          Recommended: Square image, at least 200x200px. PNG or JPG format.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt="Organization logo"
                    className="w-24 h-24 object-contain rounded-lg border border-border bg-muted"
                  />
                ) : (
                  <p className="text-muted-foreground">No logo uploaded</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Industry
                  </label>
                  {isEditingOrg ? (
                    <input
                      type="text"
                      value={editedOrg.industry}
                      onChange={(e) => setEditedOrg({ ...editedOrg, industry: e.target.value })}
                      placeholder="Technology, Healthcare..."
                      className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                    />
                  ) : (
                    <p className="text-foreground">{organization.industry || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Company Size
                  </label>
                  {isEditingOrg ? (
                    <select
                      value={editedOrg.size}
                      onChange={(e) => setEditedOrg({ ...editedOrg, size: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  ) : (
                    <p className="text-foreground">{organization.size || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Description
                </label>
                {isEditingOrg ? (
                  <textarea
                    value={editedOrg.description}
                    onChange={(e) => setEditedOrg({ ...editedOrg, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-foreground resize-none"
                  />
                ) : (
                  <p className="text-foreground whitespace-pre-wrap">{organization.description || 'No description provided'}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>


    </div>
  )
}
