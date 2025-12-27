// Defines modrinth interfaces
interface ModrinthDependencies {
    avoids: Record<string, boolean>;
    needs: Record<string, boolean>;
    wants: Record<string, boolean>;
}
interface ModrinthDetails {
    as: string;
    dependency: {
        avoids: string[];
        needs: string[];
        wants: string[];
    };
    hash: string;
    size: number;
    url: string;
}
interface ModrinthProject {
    additional_categories: string[];
    approved: string | null;
    body: string;
    body_url: string | null;
    categories: string[];
    client_side: string;
    color: number | null;
    description: string;
    discord_url: string | null;
    donation_urls: {
        id: string;
        platform: string;
        url: string;
    }[];
    downloads: number;
    followers: number;
    gallery: {
        created: string;
        description: string | null;
        featured: boolean;
        ordering: number;
        title: string | null;
        url: string;
    }[];
    game_versions: string[];
    icon_url: string | null;
    id: string;
    issues_url: string | null;
    license: {
        id: string;
        name: string;
        url: string | null;
    };
    loaders: string[];
    moderator_message: {
        message: string;
        body: string | null;
    };
    monetization_status: string;
    organization: null;
    project_type: string;
    published: string;
    queued: string | null;
    requested_status: string | null;
    server_side: string;
    slug: string;
    source_url: string | null;
    status: string;
    team: string;
    thread_id: string;
    title: string;
    updated: string;
    versions: string[];
    wiki_url: string | null;
}
interface ModrinthVersion {
    author_id: string;
    changelog: string | null;
    changelog_url: string | null;
    date_published: string;
    dependencies: {
        dependency_type: string;
        file_name: string | null;
        project_id: string | null;
        version_id: string | null;
    }[];
    downloads: number;
    featurd: boolean;
    files: {
        file_type: string | null;
        filename: string;
        hashes: {
            sha1: string;
            sha512: string;
        };
        id: string;
        primary: boolean;
        size: number;
        url: string;
    }[];
    game_versions: string[];
    id: string;
    loaders: string[];
    name: string;
    project_id: string;
    requested_status: string | null;
    status: string;
    version_number: string;
    version_type: string;
}

// Defines source interface
interface Source {
    // Defines origin fields
    readonly origin: string;
    
    // Defines origin methods
    sync(): Promise<boolean>;
    test(): Promise<boolean>;
}
