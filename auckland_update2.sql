--
-- PostgreSQL database dump
--

\restrict 7YuDX1AkhO08d9S4vYegJXeHYxXOo2ctudtIbg0ua8JChlYLreuY16E4o0jcZw8

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    description text,
    is_secret boolean DEFAULT false,
    updated_by character varying,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_settings OWNER TO postgres;

--
-- Name: aos_squads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.aos_squads (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    priority integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.aos_squads OWNER TO postgres;

--
-- Name: application_forms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_forms (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    department_code text NOT NULL,
    title text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    roles_on_accept text,
    is_whitelist boolean DEFAULT false,
    notify_ranks text
);


ALTER TABLE public.application_forms OWNER TO postgres;

--
-- Name: application_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    submission_id character varying NOT NULL,
    user_id character varying NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.application_messages OWNER TO postgres;

--
-- Name: application_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_questions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    form_id character varying NOT NULL,
    label text NOT NULL,
    type text NOT NULL,
    options text,
    is_required boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.application_questions OWNER TO postgres;

--
-- Name: application_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_submissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    form_id character varying NOT NULL,
    user_id character varying NOT NULL,
    department_code text NOT NULL,
    status text DEFAULT 'pending'::text,
    answers text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.application_submissions OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    action text NOT NULL,
    category text NOT NULL,
    details text,
    target_id character varying,
    target_type text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    color text NOT NULL,
    icon text,
    leadership_role_ids text[] DEFAULT '{}'::text[],
    member_role_ids text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: form_managers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_managers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    form_id character varying NOT NULL,
    user_id character varying NOT NULL,
    assigned_by character varying,
    assigned_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.form_managers OWNER TO postgres;

--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    path text NOT NULL,
    icon text,
    required_permission text,
    priority integer DEFAULT 0,
    is_visible boolean DEFAULT true,
    parent_id character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    link text,
    related_id character varying,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: ranks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ranks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    department_code text NOT NULL,
    name text NOT NULL,
    abbreviation text,
    priority integer NOT NULL,
    is_leadership boolean DEFAULT false,
    callsign_prefix text,
    discord_role_id text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ranks OWNER TO postgres;

--
-- Name: role_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_mappings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    discord_role_id text NOT NULL,
    discord_role_name text,
    website_permission text NOT NULL,
    staff_tier text,
    priority integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.role_mappings OWNER TO postgres;

--
-- Name: roster_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roster_members (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    department_code text NOT NULL,
    rank_id character varying NOT NULL,
    character_name text,
    callsign text,
    callsign_number integer,
    is_active boolean DEFAULT true,
    joined_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    qid text,
    squad_id character varying
);


ALTER TABLE public.roster_members OWNER TO postgres;

--
-- Name: server_updates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.server_updates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    image_url text,
    author_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.server_updates OWNER TO postgres;

--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: sops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sops (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    department_code text NOT NULL,
    title text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    sections text,
    uploaded_by character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sops OWNER TO postgres;

--
-- Name: support_faqs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_faqs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category text DEFAULT 'General'::text,
    priority integer DEFAULT 0,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_faqs OWNER TO postgres;

--
-- Name: support_forms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_forms (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    title text NOT NULL,
    description text,
    is_open boolean DEFAULT true,
    access_tiers text[] DEFAULT '{}'::text[],
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_forms OWNER TO postgres;

--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    submission_id character varying NOT NULL,
    user_id character varying NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_messages OWNER TO postgres;

--
-- Name: support_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_questions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    form_id character varying NOT NULL,
    label text NOT NULL,
    type text NOT NULL,
    options text,
    is_required boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_questions OWNER TO postgres;

--
-- Name: support_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_submissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    form_id character varying NOT NULL,
    user_id character varying NOT NULL,
    status text DEFAULT 'pending'::text,
    answers text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_submissions OWNER TO postgres;

--
-- Name: user_role_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_role_assignments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    role_id character varying NOT NULL,
    assigned_by character varying,
    assigned_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_role_assignments OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    discord_id text NOT NULL,
    username text NOT NULL,
    discriminator text,
    avatar text,
    email text,
    roles text[] DEFAULT '{}'::text[],
    access_token text,
    refresh_token text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    website_roles text[] DEFAULT '{}'::text[],
    is_staff boolean DEFAULT false,
    staff_tier text,
    staff_tiers text[] DEFAULT '{}'::text[],
    display_name text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: website_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.website_roles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    color text DEFAULT '#6b7280'::text,
    permissions text[] DEFAULT '{}'::text[],
    staff_tier text,
    discord_role_id text,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.website_roles OWNER TO postgres;

--
-- Data for Name: admin_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_settings (id, key, value, description, is_secret, updated_by, updated_at) FROM stdin;
d4eb112c-4c60-4152-a3c3-094c1ad35d64	staff_view_audit_log	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:17.34762
4a79a168-6c86-4b1b-9f31-dc35f888fb07	staff_manage_settings	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:17.57807
3fe38ab1-3886-40ff-8762-3d76eed10d67	server_name	Tamaki Makaurau RP	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-17 10:37:59.161
66ab46c2-1208-4003-b550-069d29fd4b89	about_description		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-17 10:37:59.569
527dc42f-3dbb-4798-9bdf-21adff74cb09	staff_sync_roles	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:17.823061
4b1d6f20-fce8-43ce-bed9-a2af4fc998fc	staff_manage_leadership	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:18.055173
071284f8-46ea-4e8c-a554-d019caaf090c	discord_invite	https://discord.gg/gtVMz33Z	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-17 10:37:59.819
4a2dc564-fb8b-4567-83fb-66055be84e5a	fivem_connect	https://cfx.re/join/3m3dyz	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-17 10:38:00.187
2cfbc02d-7b45-4a4f-8ec9-373e139f37de	staff_delete_applications	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:18.286304
203da119-ca96-4372-9440-2602b778c8ef	maintenance_mode	false	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-17 10:38:00.582
fb2e9098-104d-4a4c-b463-53084edfa614	registration_open	true	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-17 10:38:00.844
e199402a-2824-4612-b0a3-76ed9b499b63	application_cooldown	7	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-17 10:38:01.471
402278be-11c9-43fa-ae9f-461978c5afee	fire_access_discord_role_id	1027908734804037702	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 01:39:12.836045
931f580b-1f24-4279-847c-6597b702ed97	police_access_discord_role_id	1027902719010279445	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 01:39:49.937
4c72b9da-2004-486b-aa47-4d5b91f7936c	ems_access_discord_role_id	1027902716665663488	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 01:40:31.437783
1c355973-2edb-41ce-8e5b-bfa107360cb3	towing_access_discord_role_id	1404050461581115453	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 01:40:47.073252
3ab1d05c-7292-44bc-8652-721608d9b283	traffic_access_discord_role_id	1474307982694158397	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 01:41:04.159633
571401b5-538b-41cc-ac07-2339181bb4a3	seo_home_title		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:39.439689
defa857a-d6c8-47e0-a7af-af48f4b94c34	seo_home_description		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:39.660672
58f0c7c5-acaf-45b6-bd99-2523321c3db7	seo_team_title		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:39.878582
6d99b031-33cc-446d-93a2-fd93ad6fa5c1	seo_team_description		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:40.098001
ca059108-0548-4839-a2fa-66942cd598ae	seo_join_title		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:40.313966
50773c1f-47d6-4458-8df7-6d48e3020c52	seo_join_description		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:40.541489
49178df3-a8fc-4ec9-b6aa-9ca6e33d3910	seo_support_title		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:40.766313
89d48dc6-1c0c-42c1-b001-040a991c0e5a	seo_support_description		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:40.982498
67dbac16-8c1f-4282-a465-9818ae15e35a	seo_departments_title		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:41.214329
9f2f387b-f6bb-4a08-8eb4-9f785446213d	seo_departments_description		\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:01:41.434445
d71d6629-2d32-4116-b254-643790203783	access_view_applications	manager	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:13.892019
afbb62e3-3770-4246-8063-9e3b3da93045	access_manage_sops	manager	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:14.121638
d99abfb8-78fe-4333-a055-215e47f3e558	access_post_updates	manager	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:14.359933
906552ef-a72f-4ae3-9216-62fdc0aa9df9	access_manage_roster	manager	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:14.598705
89df5f20-ad52-48e9-8332-8a5fabd3d185	access_manage_forms	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:14.832748
3c589ac5-3bc2-47aa-8061-892baa258dcd	access_accept_applications	manager	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:15.051097
718e39e4-dbe0-4e40-baef-3d925d63e55d	access_manage_faqs	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:15.270708
1deb0d06-67db-4595-bc18-25299bd6b903	access_manage_ranks	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:15.503758
52d79675-bbf5-409a-940b-8d0622d05da1	staff_access_admin_panel	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:15.977846
ac968288-73fe-4a9a-8b56-deab37802237	staff_manage_users	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:16.203798
7a89118e-078e-4dde-9fad-700c5029b43d	staff_manage_players	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:16.426529
753a39a0-7976-475e-821e-dfc5574abc5f	staff_manage_roles	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:16.667082
672d13e8-3564-49df-8418-ffc88d0019cd	staff_manage_access_control	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:16.897496
ec1bcb1e-ade5-4d74-ae05-1b13e468ea9e	staff_manage_seo	executive	\N	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 02:02:17.124016
\.


--
-- Data for Name: aos_squads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.aos_squads (id, name, priority, created_at) FROM stdin;
5a5f6d54-40ff-45cb-a460-c71725a3c2db	Squad 1	0	2026-02-12 07:59:17.297526
e30a2c94-3066-47cb-873e-19105f7d93ce	Squad 2	1	2026-02-12 07:59:30.0768
7bad35ae-851b-49bb-8a72-3fef557237c5	Squad 3	2	2026-02-12 07:59:39.735582
\.


--
-- Data for Name: application_forms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_forms (id, department_code, title, description, is_active, created_by, created_at, updated_at, roles_on_accept, is_whitelist, notify_ranks) FROM stdin;
1b59d642-544f-46aa-804d-6eb77fe570bd	ems	EAS Whitelist Application	Apply to become a Paramedic within Auckland EAS	t	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-15 13:06:55.828394	2026-02-16 02:35:25.398	{"discordRoleIds":["1465162818935591056"],"websiteRoles":["ems"]}	t	\N
070aac23-d6cc-4a08-a406-967309d9bc2c	towing	whitelist	whitelist	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-20 08:41:39.239444	2026-02-20 08:41:39.239444	{"discordRoleIds":["1474307650131857551"],"websiteRoles":["towing"]}	t	["5d2c9382-7146-44f6-818a-8a8131bf9d4d"]
20879c10-e708-47e7-affd-7f3010cdda71	traffic	whitelist	whitelist	f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-20 08:45:36.449814	2026-02-20 08:45:36.449814	{"discordRoleIds":["1474318282726179001"],"websiteRoles":["traffic"]}	t	["623fda7d-147a-4c82-864a-7d1b0ce8cf86"]
\.


--
-- Data for Name: application_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_messages (id, submission_id, user_id, content, created_at) FROM stdin;
\.


--
-- Data for Name: application_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_questions (id, form_id, label, type, options, is_required, priority, created_at) FROM stdin;
b922d72e-5a03-4f6a-9c99-9faaf7e2eb76	1b59d642-544f-46aa-804d-6eb77fe570bd	What is your character's name and age?	short_answer	[]	t	0	2026-02-16 02:35:25.404736
0fdcd7d7-b7bc-428c-aa87-110b1b35ede3	1b59d642-544f-46aa-804d-6eb77fe570bd	What is your Discord Name & ID?	short_answer	[]	t	1	2026-02-16 02:35:25.407974
caa4c6ca-3b10-43e9-99e5-6d890822403f	1b59d642-544f-46aa-804d-6eb77fe570bd	What does 'stay in character' mean?	long_answer	[]	t	2	2026-02-16 02:35:25.410892
6b631925-c3f2-4f33-b294-27910dedb912	1b59d642-544f-46aa-804d-6eb77fe570bd	What is the first thing you check when you arrive at a patient?	long_answer	[]	t	3	2026-02-16 02:35:25.414013
01f0f981-44bd-48a6-bd90-58958c66365f	1b59d642-544f-46aa-804d-6eb77fe570bd	How should EMS treat patients during roleplay?	long_answer	[]	t	4	2026-02-16 02:35:25.417
f0a445a2-ca87-4de1-af23-6d8366035a25	070aac23-d6cc-4a08-a406-967309d9bc2c	why do you want to be apart of the towing team?	short_answer	[]	t	0	2026-02-20 08:41:39.245623
dab94f8b-26ae-45b5-a1a4-8727eba38348	070aac23-d6cc-4a08-a406-967309d9bc2c	whats your character's name	short_answer	[]	t	1	2026-02-20 08:41:39.251314
dae660a2-3118-4d94-8aea-b745cba80d0e	20879c10-e708-47e7-affd-7f3010cdda71	whitelist q1	short_answer	[]	t	0	2026-02-20 08:45:36.456066
87ea0077-aa60-4a98-9d1e-0ef3d9652cd5	20879c10-e708-47e7-affd-7f3010cdda71	whitelist q2	short_answer	[]	t	1	2026-02-20 08:45:36.461284
\.


--
-- Data for Name: application_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_submissions (id, form_id, user_id, department_code, status, answers, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, category, details, target_id, target_type, created_at) FROM stdin;
11ffd36c-1e37-4a68-8904-84f614868e52	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: fire_access_discord_role_id	402278be-11c9-43fa-ae9f-461978c5afee	admin_setting	2026-02-23 01:39:12.843728
d1eb52c8-f6ba-411c-ac4b-a29b87b4466e	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: police_access_discord_role_id	931f580b-1f24-4279-847c-6597b702ed97	admin_setting	2026-02-23 01:39:35.941235
6844f85e-af86-4d11-a638-94c0d9604eb3	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: police_access_discord_role_id	931f580b-1f24-4279-847c-6597b702ed97	admin_setting	2026-02-23 01:39:49.942025
399d006f-05ad-41df-b8fa-6e3831ffa249	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: ems_access_discord_role_id	4c72b9da-2004-486b-aa47-4d5b91f7936c	admin_setting	2026-02-23 01:40:31.442115
3f76cb26-f8e2-4a28-ae28-7e3c0c517304	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: towing_access_discord_role_id	1c355973-2edb-41ce-8e5b-bfa107360cb3	admin_setting	2026-02-23 01:40:47.077097
007dd9a7-f065-4729-be48-dc542d7ebaa7	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: traffic_access_discord_role_id	3ab1d05c-7292-44bc-8652-721608d9b283	admin_setting	2026-02-23 01:41:04.163706
d47a0e20-05bf-4a51-a6d4-d9f643ea5470	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_home_title	571401b5-538b-41cc-ac07-2339181bb4a3	admin_setting	2026-02-23 02:01:39.445136
7db5f3d4-adb3-407a-94ba-678185e48dac	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_home_description	defa857a-d6c8-47e0-a7af-af48f4b94c34	admin_setting	2026-02-23 02:01:39.664065
1d762db8-83b1-48e5-ad46-e813e43a23cc	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_team_title	58f0c7c5-acaf-45b6-bd99-2523321c3db7	admin_setting	2026-02-23 02:01:39.881762
2af53597-c541-4f24-8794-aa118024f95a	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_team_description	6d99b031-33cc-446d-93a2-fd93ad6fa5c1	admin_setting	2026-02-23 02:01:40.101458
09f9e290-62c8-44ba-897d-8146efe0f4ff	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_join_title	ca059108-0548-4839-a2fa-66942cd598ae	admin_setting	2026-02-23 02:01:40.317275
1da36638-a77f-4f6b-a630-cbe4f54e7164	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_join_description	50773c1f-47d6-4458-8df7-6d48e3020c52	admin_setting	2026-02-23 02:01:40.544554
94649745-d39e-48a9-b0ca-655b3d711389	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_support_title	49178df3-a8fc-4ec9-b6aa-9ca6e33d3910	admin_setting	2026-02-23 02:01:40.768816
9c5b9544-e374-4cdb-8c0c-9f3441be864e	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_support_description	89d48dc6-1c0c-42c1-b001-040a991c0e5a	admin_setting	2026-02-23 02:01:40.985534
631ca59b-79ef-48e5-a937-37159168a7c3	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_departments_title	67dbac16-8c1f-4282-a465-9818ae15e35a	admin_setting	2026-02-23 02:01:41.217785
19848be4-9606-42b4-8a2b-95a799fdd7da	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: seo_departments_description	9f2f387b-f6bb-4a08-8eb4-9f785446213d	admin_setting	2026-02-23 02:01:41.437809
9c88a90d-f0d4-4fa4-8df6-1184176ad1fb	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: access_view_applications	d71d6629-2d32-4116-b254-643790203783	admin_setting	2026-02-23 02:02:13.897241
42ccc491-aa79-4b65-979d-84605b132a78	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: access_manage_sops	afbb62e3-3770-4246-8063-9e3b3da93045	admin_setting	2026-02-23 02:02:14.124641
2bb15c26-4ab3-4f4f-a6d0-d89fcbaaaf05	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: access_post_updates	d99abfb8-78fe-4333-a055-215e47f3e558	admin_setting	2026-02-23 02:02:14.367958
a8cfa8bf-bd8a-4f86-b211-fb48ab169462	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: access_manage_roster	906552ef-a72f-4ae3-9216-62fdc0aa9df9	admin_setting	2026-02-23 02:02:14.601602
42ece8c1-a76d-4719-a185-add3feae8141	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: access_manage_forms	89df5f20-ad52-48e9-8332-8a5fabd3d185	admin_setting	2026-02-23 02:02:14.835748
d41860a2-200e-4d12-ac39-2889eb5e1227	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: access_accept_applications	3c589ac5-3bc2-47aa-8061-892baa258dcd	admin_setting	2026-02-23 02:02:15.054099
6f6dd720-cefe-41c6-9e63-84a5ede05aec	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: access_manage_faqs	718e39e4-dbe0-4e40-baef-3d925d63e55d	admin_setting	2026-02-23 02:02:15.274001
fb1568d1-cb35-4f0d-811d-57ce41db6ed0	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: access_manage_ranks	1deb0d06-67db-4595-bc18-25299bd6b903	admin_setting	2026-02-23 02:02:15.732718
c233ee8d-694c-406d-b71b-3b70371fb87f	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_access_admin_panel	52d79675-bbf5-409a-940b-8d0622d05da1	admin_setting	2026-02-23 02:02:15.98156
c527ed8e-c1de-42c6-aaf4-7a2cc8b96d2c	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_manage_users	ac968288-73fe-4a9a-8b56-deab37802237	admin_setting	2026-02-23 02:02:16.210073
2198d233-1515-406e-b8be-2add7a9fc9f5	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_manage_players	7a89118e-078e-4dde-9fad-700c5029b43d	admin_setting	2026-02-23 02:02:16.431819
b67e4447-490c-478b-8ba3-9fc19c10be0a	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_manage_roles	753a39a0-7976-475e-821e-dfc5574abc5f	admin_setting	2026-02-23 02:02:16.674207
35fbe399-813c-4c50-b23d-67ac88c79011	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_manage_access_control	672d13e8-3564-49df-8418-ffc88d0019cd	admin_setting	2026-02-23 02:02:16.900997
29293e8d-fff0-423e-b36e-8e4cf0c2d7f0	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_manage_seo	ec1bcb1e-ade5-4d74-ae05-1b13e468ea9e	admin_setting	2026-02-23 02:02:17.127356
83c15bc5-a46d-4278-9525-f293ae1b9481	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_view_audit_log	d4eb112c-4c60-4152-a3c3-094c1ad35d64	admin_setting	2026-02-23 02:02:17.35086
4979f532-b1df-4cd1-865d-fe80414f2522	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_manage_settings	4a79a168-6c86-4b1b-9f31-dc35f888fb07	admin_setting	2026-02-23 02:02:17.581574
2e16304f-df9d-4140-88af-7ad69bb1ae6e	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_sync_roles	527dc42f-3dbb-4798-9bdf-21adff74cb09	admin_setting	2026-02-23 02:02:17.826732
485030e4-a24c-4dc2-9da5-c41a7cf82bd3	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_manage_leadership	4b1d6f20-fce8-43ce-bed9-a2af4fc998fc	admin_setting	2026-02-23 02:02:18.058571
0dd6b217-7897-43d2-9b85-5a7b3bfa1feb	30e9cd02-37cd-42f4-a82d-fa4541434e9c	Updated admin setting	settings	Key: staff_delete_applications	2cfbc02d-7b45-4a4f-8ec9-373e139f37de	admin_setting	2026-02-23 02:02:18.291085
0c51fd81-c338-4d9d-9043-d9c19eeff39a	e41c0f1f-5223-41c6-9544-3129448eb140	Bulk role sync	roles	Synced: 8, Failed: 11, Total: 19	\N	\N	2026-02-23 08:21:41.090955
40a82f09-684a-432a-97ab-ace3f72334a4	e41c0f1f-5223-41c6-9544-3129448eb140	Created website role	roles	Role: webiste_master	8f670e4c-15be-4568-80d2-5c553c192f57	website_role	2026-02-23 09:02:44.90612
462c5e5a-b4c0-4e2a-8ba5-a5965a3284ad	e41c0f1f-5223-41c6-9544-3129448eb140	Bulk role sync	roles	Synced: 8, Failed: 11, Total: 19	\N	\N	2026-02-23 09:03:12.627579
f1e4e187-93c6-47e7-9e9a-05650e046130	e41c0f1f-5223-41c6-9544-3129448eb140	Updated website role	roles	Role: webiste_master	8f670e4c-15be-4568-80d2-5c553c192f57	website_role	2026-02-23 09:04:07.628519
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, code, name, description, color, icon, leadership_role_ids, member_role_ids, is_active, created_at) FROM stdin;
b82c8468-166c-4dd5-b081-c1d69b26c403	police	Auckland Police Department	Serving and protecting the citizens of Tamaki Makaurau.	#3B82F6	Shield	{}	{}	t	2026-01-30 08:32:00.085456
ed772061-e099-4eed-9758-a61d4f465f3e	fire	NZ Fire & Emergency	Emergency fire response and rescue operations.	#EF4444	Flame	{}	{}	t	2026-01-30 08:32:00.085456
c3df3c11-ad8c-4d32-8f1a-44886d1b25d9	aos	Armed Offenders Squad (AOS)	Special operations and tactical response unit.	#8B5CF6	Target	{}	{}	t	2026-01-30 08:32:00.085456
32adad51-8aa1-4a49-a149-fe572293024a	ems	Emergency Ambulance Service	Providing world-class emergency medical care.	#22C55E	HeartPulse	{}	{}	t	2026-01-30 08:32:00.085456
c46817ef-fba4-4308-8ce0-0bd3e6c6649a	towing	Auckland Towing	Vehicle recovery and towing services for Tamaki Makaurau.	#F59E0B	Truck	{}	{}	t	2026-02-16 10:40:02.882865
494e2764-2bb7-4ea6-a37d-23cd63455e94	traffic	Auckland Traffic Control	Traffic management and control services for Tamaki Makaurau.	#F97316	TrafficCone	{}	{}	t	2026-02-20 07:20:01.472241
\.


--
-- Data for Name: form_managers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_managers (id, form_id, user_id, assigned_by, assigned_at) FROM stdin;
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, label, path, icon, required_permission, priority, is_visible, parent_id, created_at) FROM stdin;
d5422cfd-1686-4336-b26e-2f78fa40a45a	Home	/	\N	\N	0	t	\N	2026-01-30 08:32:00.146153
60fabbf3-2a42-4904-b980-ec339423824a	How to Join	/join	\N	\N	1	t	\N	2026-01-30 08:32:00.146153
fe97caaa-d21d-4f51-b5d0-7a1212706f35	Meet the Team	/team	\N	\N	2	t	\N	2026-01-30 08:32:00.146153
8ce21658-6ea8-472c-97af-9bb62e508d92	Departments	/departments	\N	\N	3	t	\N	2026-01-30 08:32:00.146153
5fd12463-ff26-4a12-bdd1-c0e217d109de	Admin	/admin	\N	admin	10	t	\N	2026-01-30 08:32:00.146153
84323438-d584-4d55-a20e-c6ca45875f4e	Support	/support	\N	\N	4	t	\N	2026-02-19 10:35:26.673003
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, title, message, link, related_id, is_read, created_at) FROM stdin;
8d9a8f35-d86e-445f-b139-e0f6747beb12	64f19604-5cc0-40d2-8e67-aa7d5c1b4e38	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	f	2026-02-16 01:10:50.258304
2b0de8f6-b1e8-43a0-bd96-55af2d3f45ee	e7bb17c3-ef1b-4bc0-b324-92cb54c298a3	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	f	2026-02-16 01:10:50.260503
002b4089-898b-48bd-b962-ed0ed830ccdb	480a4aac-9b6a-4855-9780-22f7a22345d6	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	f	2026-02-16 01:10:50.262525
b1fd6ba1-1585-4b87-8668-c3084e34096a	33dfd088-4c86-43a7-a15b-4ed520efa47e	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	f	2026-02-16 01:10:50.266249
a61a5428-7e28-4dea-9b6f-c2a530d21378	64f19604-5cc0-40d2-8e67-aa7d5c1b4e38	application_response	Application Reply	dirtydeedindustrys replied to their Emergency Ambulance Service application (EAS Whitelist Application).	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	f	2026-02-16 01:13:51.042553
8597ab5d-980d-4e11-8f0c-de5c949ae0e4	e7bb17c3-ef1b-4bc0-b324-92cb54c298a3	application_response	Application Reply	dirtydeedindustrys replied to their Emergency Ambulance Service application (EAS Whitelist Application).	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	f	2026-02-16 01:13:51.045766
2fe0263e-895e-4c30-8190-cd237660110c	480a4aac-9b6a-4855-9780-22f7a22345d6	application_response	Application Reply	dirtydeedindustrys replied to their Emergency Ambulance Service application (EAS Whitelist Application).	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	f	2026-02-16 01:13:51.050124
be2dd2c9-0836-4b0b-acb0-6775275d0d12	33dfd088-4c86-43a7-a15b-4ed520efa47e	application_response	Application Reply	dirtydeedindustrys replied to their Emergency Ambulance Service application (EAS Whitelist Application).	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	f	2026-02-16 01:13:51.056495
73e7b37b-00a8-431f-b00b-89dc6fa9d2cb	64f19604-5cc0-40d2-8e67-aa7d5c1b4e38	application_submitted	New Application	ghstx_x submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	d38a9c24-383d-4bfa-a9d9-35c780ecd2e4	f	2026-02-16 02:33:53.988268
d9fa3aa7-b87c-4b39-8ad3-3ee6557d3ace	e7bb17c3-ef1b-4bc0-b324-92cb54c298a3	application_submitted	New Application	ghstx_x submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	d38a9c24-383d-4bfa-a9d9-35c780ecd2e4	f	2026-02-16 02:33:53.991443
b5a41264-0414-4ec3-a39d-c96c69d28bf3	30e9cd02-37cd-42f4-a82d-fa4541434e9c	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	t	2026-02-16 01:10:50.264409
7b144a13-f911-49d6-bd0c-b6ad9e46aff1	30e9cd02-37cd-42f4-a82d-fa4541434e9c	application_response	Application Reply	dirtydeedindustrys replied to their Emergency Ambulance Service application (EAS Whitelist Application).	/departments/ems/applications	5021ca56-7b06-4135-b0d1-91f562358384	t	2026-02-16 01:13:51.053117
e407615b-34d3-4216-a7bd-28dd776f4b57	480a4aac-9b6a-4855-9780-22f7a22345d6	application_submitted	New Application	ghstx_x submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	d38a9c24-383d-4bfa-a9d9-35c780ecd2e4	f	2026-02-16 02:33:53.997491
9a9405b1-81d3-42f5-a673-87002264f4ec	33dfd088-4c86-43a7-a15b-4ed520efa47e	application_submitted	New Application	ghstx_x submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	d38a9c24-383d-4bfa-a9d9-35c780ecd2e4	f	2026-02-16 02:33:54.002374
41df7cd4-1409-4497-b3e2-92db6fc9d11a	e7bb17c3-ef1b-4bc0-b324-92cb54c298a3	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	54f78fe7-fd89-4edd-ba11-e7f0bf4ef0e5	f	2026-02-16 02:33:59.689973
8ed30497-985f-4b06-b226-51e3a0664670	480a4aac-9b6a-4855-9780-22f7a22345d6	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	54f78fe7-fd89-4edd-ba11-e7f0bf4ef0e5	f	2026-02-16 02:33:59.695343
0bdeba2a-6143-4083-914a-71266cb57b37	33dfd088-4c86-43a7-a15b-4ed520efa47e	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	54f78fe7-fd89-4edd-ba11-e7f0bf4ef0e5	f	2026-02-16 02:33:59.698177
9f4aa028-c40f-44c0-8aa0-01782b71465b	7fd58eb9-dac3-46e2-aa82-4578ce7122be	status_change	Application Updated	Your application for Emergency Ambulance Service (EAS Whitelist Application) has been under_review.	/departments/ems/applications	d38a9c24-383d-4bfa-a9d9-35c780ecd2e4	t	2026-02-16 02:34:41.745386
b0ee171b-07ea-41c4-9fae-9947e96ee4ef	e7bb17c3-ef1b-4bc0-b324-92cb54c298a3	application_submitted	New Support Submission	toenailpapi submitted a Social Media Applications application.	/support?form=4e5b7c5e-3633-4296-983a-ff5af2debc7a&submission=1acf20ce-7b6d-461b-bcc7-390904f9c1ff	1acf20ce-7b6d-461b-bcc7-390904f9c1ff	t	2026-02-21 04:09:55.52285
3f48e6c6-1966-4e06-8fc6-5abedeb2f097	7fd58eb9-dac3-46e2-aa82-4578ce7122be	status_change	Application Updated	Your application for Emergency Ambulance Service (EAS Whitelist Application) has been accepted.	/departments/ems/applications	d38a9c24-383d-4bfa-a9d9-35c780ecd2e4	t	2026-02-16 02:35:36.391729
c35a4528-60b8-4cfe-945f-9026cb607442	30e9cd02-37cd-42f4-a82d-fa4541434e9c	application_submitted	New Application	ghstx_x submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	d38a9c24-383d-4bfa-a9d9-35c780ecd2e4	t	2026-02-16 02:33:54.005302
16fd56fb-7b9a-44c8-8131-bdca8e7f78ac	30e9cd02-37cd-42f4-a82d-fa4541434e9c	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	54f78fe7-fd89-4edd-ba11-e7f0bf4ef0e5	t	2026-02-16 02:33:59.701146
32240b84-9696-4ccd-a36b-83b9e85f46b8	64f19604-5cc0-40d2-8e67-aa7d5c1b4e38	application_submitted	New Application	dirtydeedindustrys submitted an application for Emergency Ambulance Service: EAS Whitelist Application	/departments/ems/applications	54f78fe7-fd89-4edd-ba11-e7f0bf4ef0e5	t	2026-02-16 02:33:59.687058
12bfe3fb-adeb-4c47-9172-cef79ebf13c8	e7bb17c3-ef1b-4bc0-b324-92cb54c298a3	application_submitted	New Support Submission	toenailpapi submitted a Ban Appeals application.	/support?form=e253d391-fe8c-462e-bf61-14a8246b7665&submission=7adaa425-a363-41e1-8a6b-720445dd3262	7adaa425-a363-41e1-8a6b-720445dd3262	f	2026-02-21 03:05:36.172547
bb0faf71-5e73-42b1-9d7b-f24a68baa1b9	64f19604-5cc0-40d2-8e67-aa7d5c1b4e38	application_submitted	New Support Submission	toenailpapi submitted a Ban Appeals application.	/support?form=e253d391-fe8c-462e-bf61-14a8246b7665&submission=7adaa425-a363-41e1-8a6b-720445dd3262	7adaa425-a363-41e1-8a6b-720445dd3262	f	2026-02-21 03:05:36.176825
5419d0a0-3e77-43ce-b47c-b6a4f7ddc455	480a4aac-9b6a-4855-9780-22f7a22345d6	application_submitted	New Support Submission	toenailpapi submitted a Ban Appeals application.	/support?form=e253d391-fe8c-462e-bf61-14a8246b7665&submission=7adaa425-a363-41e1-8a6b-720445dd3262	7adaa425-a363-41e1-8a6b-720445dd3262	f	2026-02-21 03:05:36.1831
5363d955-20e7-43ff-ac6c-c30ff23e75f4	33dfd088-4c86-43a7-a15b-4ed520efa47e	application_submitted	New Support Submission	toenailpapi submitted a Ban Appeals application.	/support?form=e253d391-fe8c-462e-bf61-14a8246b7665&submission=7adaa425-a363-41e1-8a6b-720445dd3262	7adaa425-a363-41e1-8a6b-720445dd3262	f	2026-02-21 03:05:36.18791
aa33a445-c125-4b45-a4e2-0dd10ea538c2	30e9cd02-37cd-42f4-a82d-fa4541434e9c	application_submitted	New Support Submission	toenailpapi submitted a Ban Appeals application.	/support?form=e253d391-fe8c-462e-bf61-14a8246b7665&submission=7adaa425-a363-41e1-8a6b-720445dd3262	7adaa425-a363-41e1-8a6b-720445dd3262	f	2026-02-21 03:05:36.191195
a58f4059-2db9-48b9-a02d-43f490f6db1b	64f19604-5cc0-40d2-8e67-aa7d5c1b4e38	application_submitted	New Support Submission	toenailpapi submitted a Social Media Applications application.	/support?form=4e5b7c5e-3633-4296-983a-ff5af2debc7a&submission=1acf20ce-7b6d-461b-bcc7-390904f9c1ff	1acf20ce-7b6d-461b-bcc7-390904f9c1ff	f	2026-02-21 04:09:55.532175
8de9744f-db20-4150-8afd-838d59b8135d	480a4aac-9b6a-4855-9780-22f7a22345d6	application_submitted	New Support Submission	toenailpapi submitted a Social Media Applications application.	/support?form=4e5b7c5e-3633-4296-983a-ff5af2debc7a&submission=1acf20ce-7b6d-461b-bcc7-390904f9c1ff	1acf20ce-7b6d-461b-bcc7-390904f9c1ff	f	2026-02-21 04:09:55.545152
32163cca-d2d3-41e0-ab1b-57da14d6f36f	33dfd088-4c86-43a7-a15b-4ed520efa47e	application_submitted	New Support Submission	toenailpapi submitted a Social Media Applications application.	/support?form=4e5b7c5e-3633-4296-983a-ff5af2debc7a&submission=1acf20ce-7b6d-461b-bcc7-390904f9c1ff	1acf20ce-7b6d-461b-bcc7-390904f9c1ff	f	2026-02-21 04:09:55.551032
94834142-7b28-4795-85ed-b555a0a5f3b7	30e9cd02-37cd-42f4-a82d-fa4541434e9c	application_submitted	New Support Submission	toenailpapi submitted a Social Media Applications application.	/support?form=4e5b7c5e-3633-4296-983a-ff5af2debc7a&submission=1acf20ce-7b6d-461b-bcc7-390904f9c1ff	1acf20ce-7b6d-461b-bcc7-390904f9c1ff	t	2026-02-21 04:09:55.556343
\.


--
-- Data for Name: ranks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ranks (id, department_code, name, abbreviation, priority, is_leadership, callsign_prefix, discord_role_id, created_at) FROM stdin;
52fe47d3-37d4-4a23-978b-672a1508a381	ems	Emergency Medical Technician	EMT	7	f	4-	1465162815831805992	2026-01-30 08:32:00.138619
11d2d676-fc60-4699-a6eb-24fba569baf3	ems	First Responder	FR	8	f	5-	1465162818935591056	2026-01-30 08:32:00.138619
6c9538c2-1316-43f2-80a9-e3079a291899	police	Inspector	INSP	6	f	2-	1465161763996827649	2026-01-30 08:32:00.128853
8c7e59e6-a748-4536-a9eb-834529b5ba4a	police	Sergeant	SGT	8	f	3-	1465161769319141508	2026-01-30 08:32:00.128853
687c9075-e0fe-4297-a94a-a98b787a62a1	police	Constable	CONST	10	f	5-	1465161774960742645	2026-01-30 08:32:00.128853
7a213743-7af1-4232-a6de-f56dc3d339dc	police	Senior Sergeant	S/SGT	7	f	2-	1465161766873989140	2026-01-30 08:32:00.128853
ca29f135-bfb7-4bd0-a094-994cefd05857	fire	Senior Station Officer	SSO	3	f	2-	1465163238437294266	2026-01-30 08:32:00.133077
6196fb7d-4569-4b54-b325-5b2f1ea050a5	fire	Station Officer	SO	4	f	2-	1465163241796796467	2026-01-30 08:32:00.133077
603f7110-7fef-4c71-9821-8d0df1398556	fire	Senior Firefighter	SFF	5	f	3-	1465163247719026750	2026-01-30 08:32:00.133077
003cfccc-12d7-4185-b5e1-b904157ad95e	fire	Qualified Firefighter	QFF	6	f	4-	1465163250197856381	2026-01-30 08:32:00.133077
4e332c76-7f30-4e53-a01b-40f6105b050d	fire	Firefighter	FF	7	f	5-	1465163252727152731	2026-01-30 08:32:00.133077
51fe1767-a67d-433b-91b6-ca1e1d90e7a9	police	Commissioner	COMM	1	t	1-	1465161710582366299	2026-01-30 08:32:00.128853
335b7425-fb26-4b30-9066-2bb6c042a3c9	fire	Recruit	REC	8	f	6-	1465163255038345362	2026-01-30 08:32:00.133077
fc56a5e9-5329-402b-8636-0a729e3e96ad	police	Deputy Commissioner	D/COMM	2	t	1-	1465161752818745344	2026-01-30 08:32:00.128853
68f5499d-7c9d-4d0a-9cc0-8bbf6e12e690	ems	District Operations Manager	DOM	1	t	1-	1465162590635425793	2026-01-30 08:32:00.138619
4833b41a-9ee3-461a-9d2c-7d8977e727e9	ems	Group Operations Manager	GOM	2	t	1-	1465162726761566457	2026-01-30 08:32:00.138619
a969e7a8-cf6f-45e2-9f62-62c2df23fa76	police	Assistant Commissioner	A/COMM	3	t	1-	1465161755977191569	2026-01-30 08:32:00.128853
b78fa00a-426e-48f9-8d78-c632116165a1	ems	Critical Care Paramedic	CCP	4	f	2-	1465162742041280746	2026-01-30 08:32:00.138619
aa4efc5c-85bd-4f20-910e-99b89cfd796f	police	Superintendent (Executive)	SUPT-E	4	t	1-	1465161758930108459	2026-01-30 08:32:00.128853
60ffeb0f-2f4e-42e9-94c1-36d9daa11a86	ems	Intensive Care Paramedic	ICP	5	f	2-	1465162795061350563	2026-01-30 08:32:00.138619
1e926c6b-1152-4696-8b7b-91d2ec0d47af	police	Superintendent (Non-Executive)	SUPT	5	t	1-	1465161761627050024	2026-01-30 08:32:00.128853
af1cad00-e92e-4c54-a5f3-83f7796ee8e5	ems	Paramedic	PM	6	f	3-	1465162812685815828	2026-01-30 08:32:00.138619
cd362fe1-0de6-460f-9ef8-dcbaf9c1f352	aos	Officer		7	f		1465168550342951216	2026-02-13 06:12:02.091272
9219b8ab-9a4b-4893-9543-6e2e6f0c6e2d	police	Senior Constable	S/CONST	9	f	4-	1465161771567550474	2026-01-30 08:32:00.128853
ed50489d-5319-4af2-baa1-bd9af118dc3b	aos	Recruit		8	f		1465168552121073847	2026-02-13 06:12:39.759903
e153a291-15a4-48e3-8954-b4531c8ab047	police	Recruit	REC	11	f	6-	1465161777133387828	2026-01-30 08:32:00.128853
f5a3b710-542d-4426-b023-7905720fcfeb	aos	Probationary		9	f		1465168567224897690	2026-02-13 06:13:00.052818
5d2c9382-7146-44f6-818a-8a8131bf9d4d	towing	Company Owner	OWNER	10	t		1474305322704175104	2026-02-20 08:16:28.128387
79b8fed2-bc68-4342-b5e3-7e097ae5e0ba	aos	Commander		1	t		1414149579707781190	2026-02-13 04:50:08.75555
72c90afb-5eb2-4ea8-8e69-bf89f34211f6	aos	Assistant Commander		2	t		1471749143923003558	2026-02-13 06:05:15.9174
7d4caa79-1ed9-44e1-9dd7-b66d5b96e73b	aos	Squad Leader		3	f		1414149712541388901	2026-02-13 06:06:24.703111
717eb4a7-1000-4374-a7d9-1e1f60f503f9	aos	Senior Officer		4	f		1465168535750840460	2026-02-13 06:06:44.660179
f28489a7-213f-4976-8ed0-3c9eeb9e92b5	aos	Officer II		5	f		1465168541711077496	2026-02-13 06:10:31.189534
376527bb-2c4d-4444-a957-11d237a47eae	aos	Officer I		6	f		1465168543837327393	2026-02-13 06:11:01.659385
ee7eae39-f833-40f2-9daa-16eb0fb74bef	towing	Operations Manager	OM	10	t		1474305615680634890	2026-02-20 08:16:55.976764
48094436-875d-4b76-beb4-178a5bbf2ca5	towing	Supervisor		10	f		1474307040720584838	2026-02-20 08:17:15.944187
4f26e996-5c31-4465-9732-5d91d027963e	towing	Team Leader		10	f		1474307425480999033	2026-02-20 08:17:28.440236
35a802b1-1272-474a-87c3-59e6e63419b7	towing	Heavy Recovery		10	f		1474307355004108811	2026-02-20 08:17:43.269735
7be53283-95c0-4283-8ac3-7d061b3ed1aa	towing	Senior Operator		10	f		1474307324884553930	2026-02-20 08:17:56.520903
04ea8fa6-6825-4ceb-bcf3-10fd33a2853f	towing	Tow Operator		10	f		1474307663478259722	2026-02-20 08:18:09.11951
add4f570-6ea2-46d8-93a0-5ccf605d884c	towing	Tow Recruit		10	f		1474307650131857551	2026-02-20 08:18:19.958064
623fda7d-147a-4c82-864a-7d1b0ce8cf86	traffic	Traffic Manager		10	t		1474308125627646067	2026-02-20 08:19:20.861233
ad233882-b0e5-406e-9c95-f52226a7ad64	traffic	Traffic Foreman		10	t		1474317402442563584	2026-02-20 08:19:38.846384
5c9a6957-cc9a-42db-9dcb-f6822c1ab5dd	traffic	Temporary Traffic Planner		10	t		1474317417260912774	2026-02-20 08:19:59.244731
9f073512-0b8f-4857-b1c2-5ed7205da4e8	traffic	STMS - Category C		10	f		1474317420389863454	2026-02-20 08:20:23.540733
2d1e52a1-24b3-4960-b178-e7e01f1386e0	traffic	STMS - Category B		10	f		1474317423439253625	2026-02-20 08:20:33.56138
5fc381c8-f351-4970-bd29-6c536a4ac072	traffic	STMS - Category A		10	f		1474317426379329659	2026-02-20 08:20:47.614692
b8d3c1a7-5190-4995-98d1-8f6481216a8a	traffic	Traffic Operative		10	f		1474317428791185500	2026-02-20 08:20:59.247267
99303f74-3eaa-46c2-96bc-bba25cee98a2	traffic	Traffic Controller		10	f		1474318282726179001	2026-02-20 08:21:11.512469
b17fc2ca-ef64-471a-9ce1-abe8d55db5cd	ems	Watch Operations Manager	WOM	2	f	2-	1465162738945888450	2026-02-21 03:01:22.885794
c792cc31-017e-4904-94df-27185f4f9f64	fire	District Manager	DM	1	t	1-	1465163226013634631	2026-01-30 08:32:00.133077
ad51b7b3-dcbe-4962-a355-045a768ac75a	fire	Group Manager	GM	2	t	1-	1465163230975496212	2026-01-30 08:32:00.133077
\.


--
-- Data for Name: role_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_mappings (id, discord_role_id, discord_role_name, website_permission, staff_tier, priority, created_at) FROM stdin;
4d55b87e-7749-40be-b9f5-da22917fd759	1027902719010279445	Auckland Police	police	\N	100	2026-02-10 08:37:37.39663
375fe42d-481e-45ad-a57d-6624fe5e52b1	1027908734804037702	Fire Rescue Service	fire	\N	100	2026-02-10 08:37:37.39663
3a4d80ba-22c8-4fff-bc1a-d354f4e10117	1027902716665663488	Emergency Ambulance Service	ems	\N	100	2026-02-10 08:37:37.39663
18bb1d49-30bc-43f9-98b9-1a1f4bdbc114	1410115394399633408	AOS	aos	\N	100	2026-02-10 09:11:49.687049
37c9cf6f-6dc4-4bbb-9242-8f3569368216	1404050461581115453	Auckland Towing	towing	\N	100	2026-02-16 10:40:07.312184
87067776-6064-4e0b-8c5f-cfe1d6d0c831	1474307982694158397	Auckland Traffic Control	traffic	\N	100	2026-02-20 08:24:40.975867
\.


--
-- Data for Name: roster_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roster_members (id, user_id, department_code, rank_id, character_name, callsign, callsign_number, is_active, joined_at, updated_at, qid, squad_id) FROM stdin;
e28fcf7d-38e0-4135-ab31-0f9d1b5c47dd	30e9cd02-37cd-42f4-a82d-fa4541434e9c	police	687c9075-e0fe-4297-a94a-a98b787a62a1	\N	\N	\N	t	2026-02-10 07:04:58.744915	2026-02-10 07:04:58.744915	ACP01A	\N
3aa0ef66-bde0-4b9a-9720-5c45fe80cd65	e41c0f1f-5223-41c6-9544-3129448eb140	police	687c9075-e0fe-4297-a94a-a98b787a62a1	\N	\N	\N	t	2026-02-10 07:04:58.790597	2026-02-10 07:04:58.790597	ACP01B	\N
88426316-7128-4cf6-b16c-29f55dcbfe18	6fd7824a-200f-45bc-9871-03ae05bc97ed	police	aa4efc5c-85bd-4f20-910e-99b89cfd796f	\N	\N	\N	t	2026-02-10 08:34:22.378986	2026-02-10 08:34:22.378986	ACP01C	\N
d7f17355-e277-42d8-9cb3-16c033bc417f	6a10b692-9506-40bd-a05c-06e43896958d	police	9219b8ab-9a4b-4893-9543-6e2e6f0c6e2d	\N	\N	\N	t	2026-02-10 08:34:22.419084	2026-02-10 08:34:22.419084	ACP01D	\N
e6ebd702-9480-450f-83f7-d3dd3f3836aa	875bac79-7706-4090-8856-dca2ad880eec	police	9219b8ab-9a4b-4893-9543-6e2e6f0c6e2d	\N	\N	\N	t	2026-02-10 08:34:22.426478	2026-02-10 08:34:22.426478	ACP01E	\N
df257ad6-09cd-47a7-9186-ecf42419de47	99771803-70f0-4ad3-a8dd-5ac014651e0c	police	687c9075-e0fe-4297-a94a-a98b787a62a1	\N	\N	\N	t	2026-02-10 08:34:22.438721	2026-02-10 08:34:22.438721	ACP01F	\N
f3fd24b7-9e54-47e5-8a21-bfc1fd260ee1	480a4aac-9b6a-4855-9780-22f7a22345d6	police	51fe1767-a67d-433b-91b6-ca1e1d90e7a9	\N	\N	\N	t	2026-02-10 08:53:12.867951	2026-02-10 08:53:12.867951	ACP01G	\N
b6c19512-d8e4-43fc-8b6d-d843786e2c6e	06391685-1436-4035-a3af-dc6ad6bf42f6	police	9219b8ab-9a4b-4893-9543-6e2e6f0c6e2d	\N	\N	\N	t	2026-02-12 07:49:27.753655	2026-02-12 07:49:27.753655	ACP01H	\N
000e9a4d-1d28-4c43-a0b1-b5f456a80513	e7bb17c3-ef1b-4bc0-b324-92cb54c298a3	police	9219b8ab-9a4b-4893-9543-6e2e6f0c6e2d	\N	\N	\N	t	2026-02-12 07:49:27.758237	2026-02-12 07:49:27.758237	ACP01I	\N
801f8b42-0f3b-4473-b0a6-479d089d3fb1	a3423273-41d2-4cdd-ba6e-1cf5512de15e	police	6c9538c2-1316-43f2-80a9-e3079a291899	\N	\N	\N	t	2026-02-12 07:55:11.126928	2026-02-12 07:55:11.126928	ACP01J	\N
841321d5-cc9f-4445-805e-e2652cf55e43	33dfd088-4c86-43a7-a15b-4ed520efa47e	police	9219b8ab-9a4b-4893-9543-6e2e6f0c6e2d	\N	\N	\N	t	2026-02-13 06:14:52.081875	2026-02-13 06:14:52.081875	ACP01K	\N
ccea6b1c-5587-4270-80dd-4423d3c9f0d5	71c3b3c6-9f18-4335-9789-3c50153581f1	police	687c9075-e0fe-4297-a94a-a98b787a62a1	\N	\N	\N	t	2026-02-15 08:00:03.578571	2026-02-15 08:00:03.578571	ACP01L	\N
97049f81-c3a6-411f-9521-18fb17b686f2	26a58610-36f2-4e0f-a40c-9e7995a74f1c	police	e153a291-15a4-48e3-8954-b4531c8ab047	\N	\N	\N	t	2026-02-17 04:37:36.580057	2026-02-17 04:37:36.580057	ACP01M	\N
024bc32a-c057-46cd-83a5-6eb32b19586d	5175ba5a-87ca-4c0c-a715-decdc682d9d8	police	1e926c6b-1152-4696-8b7b-91d2ec0d47af	\N	\N	\N	t	2026-02-23 10:23:14.53357	2026-02-23 10:23:14.53357	ACP01N	\N
\.


--
-- Data for Name: server_updates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.server_updates (id, title, description, image_url, author_id, created_at) FROM stdin;
cfaf21d3-ae93-4dde-8d91-5bb836e3eb12	Server Under Maintenance!	Server is currently under maintenance and is closed to the public. We plan to re-release on 28/02/26 	\N	30e9cd02-37cd-42f4-a82d-fa4541434e9c	2026-02-23 01:03:11.393236
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
QSaY3guD6jEay2JIi0YTQrceFABa9hqs	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-28T09:43:29.821Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"fb25c031-f05c-4521-8824-8fead841287b"}}	2026-02-28 09:52:40
idCZc6xdq-VtB__q8f5nS0nUPw--m1mz	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-24T04:45:56.622Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"e7bb17c3-ef1b-4bc0-b324-92cb54c298a3"}}	2026-03-02 08:48:34
f-krti_tzudYunmG9Dg1HcseVqj4smiB	{"cookie":{"originalMaxAge":604800000,"expires":"2026-03-02T08:20:57.744Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"eb23c389-fbdf-4701-b798-8d856dfaabbe"}}	2026-03-02 09:10:59
pucvfS3BpH5rgQF0rxBuV8aBS0XF84UW	{"cookie":{"originalMaxAge":604800000,"expires":"2026-03-02T08:17:32.688Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"30e9cd02-37cd-42f4-a82d-fa4541434e9c"}}	2026-03-02 10:46:49
1RRF3dI1uw9OYJq65g7XquTXGema7UN_	{"cookie":{"originalMaxAge":604800000,"expires":"2026-03-02T23:18:36.708Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"30e9cd02-37cd-42f4-a82d-fa4541434e9c"}}	2026-03-02 23:23:49
37-WKbsSpT-tS7wYEXmsFN2yTYnVLSgO	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-23T10:45:48.119Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"30e9cd02-37cd-42f4-a82d-fa4541434e9c"}}	2026-02-24 10:38:36
ilrY-cCIQyRIFKwBaniZgAtxjqrtjHoP	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-22T07:48:29.961Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"71c3b3c6-9f18-4335-9789-3c50153581f1"}}	2026-02-24 04:16:33
2gyangx5-QSg-IfI49BBeCtRC7MTFByt	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-24T04:37:08.710Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"26a58610-36f2-4e0f-a40c-9e7995a74f1c"}}	2026-02-24 04:37:58
qe3codFIE2BFw9qdK49paUrAscGMw8I9	{"cookie":{"originalMaxAge":604800000,"expires":"2026-03-02T00:31:05.312Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"30e9cd02-37cd-42f4-a82d-fa4541434e9c"}}	2026-03-02 02:18:15
s4YeNymk5l5YKUYb4rY4pUVMtBPRq5oO	{"cookie":{"originalMaxAge":604800000,"expires":"2026-03-02T10:23:02.680Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"5175ba5a-87ca-4c0c-a715-decdc682d9d8"}}	2026-03-02 10:57:00
e4Ue7NNLk3OLoXjLWA9IbdzDKVZ1DlDi	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-22T01:32:09.298Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"e41c0f1f-5223-41c6-9544-3129448eb140"}}	2026-02-28 10:23:04
8WuGPXZjo8tLsiQJ5Lt23wkHyv6TxI0s	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-27T08:22:37.970Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"7fd58eb9-dac3-46e2-aa82-4578ce7122be"}}	2026-02-27 09:22:30
m5rG95Y-QsxGbOKuOZO8yEf1gsDaQlZx	{"cookie":{"originalMaxAge":604800000,"expires":"2026-03-02T00:55:10.833Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"e41c0f1f-5223-41c6-9544-3129448eb140"}}	2026-03-02 10:11:09
KGJk-AmF-tHrl1OO_A2wMG85vv7KVeET	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-24T06:00:10.373Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"64f19604-5cc0-40d2-8e67-aa7d5c1b4e38"}}	2026-02-28 05:03:27
FGv-Dcr6ozXhJ2_OsnHypqVHyOrqY5qC	{"cookie":{"originalMaxAge":604800000,"expires":"2026-02-23T01:09:26.340Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"80c1a428-1345-4777-8f84-10ff81fa5e10"}}	2026-02-28 06:20:15
\.


--
-- Data for Name: sops; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sops (id, department_code, title, file_name, file_path, sections, uploaded_by, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: support_faqs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_faqs (id, question, answer, category, priority, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: support_forms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_forms (id, key, title, description, is_open, access_tiers, created_by, created_at, updated_at) FROM stdin;
e253d391-fe8c-462e-bf61-14a8246b7665	ban_appeals	Ban Appeals	Appeal a ban or punishment you've received.	t	{manager,executive,director}	\N	2026-02-19 10:35:18.478934	2026-02-19 10:35:18.478934
4e5b7c5e-3633-4296-983a-ff5af2debc7a	social_media	Social Media Applications	Apply to manage our social media presence.	t	{manager,executive,director}	\N	2026-02-19 10:35:18.478934	2026-02-19 10:35:18.478934
07909c0f-1577-4f4b-8019-8bf210e7de07	development_applications	Development Applications	Apply to join the development team.	t	{manager,executive,director}	\N	2026-02-19 10:35:18.478934	2026-02-19 11:12:04.145
dafe55d9-04a3-4dd3-a0dc-a497a760d9c8	events_staff	Events Staff Applications	Apply to help organize and run community events.	f	{manager,executive,director}	\N	2026-02-19 10:35:18.478934	2026-02-21 04:28:00.165
d6e352aa-7787-4e73-b539-2d5b3e711270	staff_applications	Staff Applications	Apply to join our staff team and help manage the server.	f	{executive,director}	\N	2026-02-19 10:35:18.478934	2026-02-21 09:00:30.789
9c11c1b6-4ee8-4295-ab48-5d840b855521	gang_applications	Gang Applications	Apply to register or manage a gang.	f	{manager,executive,director}	\N	2026-02-19 10:35:18.478934	2026-02-21 09:01:13.653
d1f2daa7-79a8-43a1-91b8-102be7dcb609	civx_applications	CivX Applications	Apply for CivX roles and activities.	f	{manager,executive,director}	\N	2026-02-19 10:35:18.478934	2026-02-23 09:03:36.211
\.


--
-- Data for Name: support_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_messages (id, submission_id, user_id, content, created_at) FROM stdin;
\.


--
-- Data for Name: support_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_questions (id, form_id, label, type, options, is_required, priority, created_at) FROM stdin;
c28d7f10-1cf2-4a68-88ed-dad5bbef7862	e253d391-fe8c-462e-bf61-14a8246b7665	Discord ID:	short_answer	\N	t	0	2026-02-21 03:05:11.484816
7128b097-c164-47c0-aa80-b70b99655e6b	e253d391-fe8c-462e-bf61-14a8246b7665	FiveM Username:	short_answer	\N	t	1	2026-02-21 03:08:44.704398
41ed1de7-1c18-45b5-83a6-3f52c37a6628	e253d391-fe8c-462e-bf61-14a8246b7665	Ban ID:	short_answer	\N	t	2	2026-02-21 03:08:44.708129
6c201bf2-f2b0-4e85-9846-12af07815ec7	e253d391-fe8c-462e-bf61-14a8246b7665	Who Banned you?	short_answer	\N	t	3	2026-02-21 03:08:44.711408
f68f55df-0e0d-4696-8d50-6f4774d9c3fe	e253d391-fe8c-462e-bf61-14a8246b7665	What was the reason for ban	long_answer	\N	t	4	2026-02-21 03:08:44.722876
2ad79650-f570-40be-9842-cfbed4602d90	e253d391-fe8c-462e-bf61-14a8246b7665	Why do you believe the ban should be revoked	long_answer	\N	t	5	2026-02-21 03:08:44.725282
c8a6527d-ad28-4546-91a6-2cfb27277e6f	e253d391-fe8c-462e-bf61-14a8246b7665	Do you take responsibility for the ban	checkbox	["Yes",  "No"]	t	6	2026-02-21 03:08:44.728065
ff3bb915-076c-4f2c-b39f-02733e9f9753	d6e352aa-7787-4e73-b539-2d5b3e711270	Discord ID:	short_answer	\N	t	0	2026-02-21 03:20:04.94997
26acca30-9603-4b78-8620-fb017d20009f	d6e352aa-7787-4e73-b539-2d5b3e711270	IRL Age:	short_answer	\N	t	1	2026-02-21 03:20:04.962442
805457d4-5049-4d9a-b921-023ab5f6e791	d6e352aa-7787-4e73-b539-2d5b3e711270	How many hours per week can you dedicate to staff duties?	short_answer	\N	t	2	2026-02-21 03:20:04.965561
365926a5-3d45-4c14-a635-20aac570fd5a	d6e352aa-7787-4e73-b539-2d5b3e711270	Have you ever been staff on a FiveM server before? (If yes, list roles, responsibilities, and how long you served)	short_answer	\N	t	3	2026-02-21 03:20:04.968614
56377842-bbd7-4e20-bcdd-991573c731b7	d6e352aa-7787-4e73-b539-2d5b3e711270	Are you currently a Staff or in a Leadership position in another FiveM server? if yes list the server and what position you are in.	short_answer	\N	t	4	2026-02-21 03:20:04.971835
9d657182-9347-4cc0-9743-e86f862c507a	d6e352aa-7787-4e73-b539-2d5b3e711270	What skills or qualities do you have that would make you a good staff member?	long_answer	\N	t	5	2026-02-21 03:20:04.974747
587696f5-17af-49ef-a5e3-ced5b76a4fbd	d6e352aa-7787-4e73-b539-2d5b3e711270	Why do you want to be staff on our server?	long_answer	\N	t	6	2026-02-21 03:20:04.977837
cd7b7db5-6558-432c-ae12-1519931c0bf8	d6e352aa-7787-4e73-b539-2d5b3e711270	What do you believe the role of a staff member is within the community?	long_answer	\N	t	7	2026-02-21 03:20:04.980426
f0b7487e-fa9a-49ce-be41-0a28a74df73c	d6e352aa-7787-4e73-b539-2d5b3e711270	How would you ensure fairness and professionalism when handling player issues?	long_answer	\N	t	8	2026-02-21 03:20:04.986138
936e31d3-080f-4131-a408-f6e47dfbd03b	d6e352aa-7787-4e73-b539-2d5b3e711270	Why should we choose you over other applicants?	long_answer	\N	t	9	2026-02-21 03:20:04.989326
ca81601b-700c-446f-a602-f4b459f9dd35	d6e352aa-7787-4e73-b539-2d5b3e711270	A player is breaking the rules but claims they didn’t know the rules existed. How do you respond?	long_answer	\N	t	10	2026-02-21 03:20:04.992256
7adb287c-ad1c-4355-ba62-e29693ed0cbf	d6e352aa-7787-4e73-b539-2d5b3e711270	A player is disrespecting you and refusing to listen. What would you do?	long_answer	\N	t	11	2026-02-21 03:20:04.995469
884e61e9-4a38-493a-9e7b-e73579d461dc	d6e352aa-7787-4e73-b539-2d5b3e711270	You catch your friend breaking server rules. How do you handle it?	long_answer	\N	t	12	2026-02-21 03:20:04.998173
243f9e53-6637-4a90-b582-dacb42a5e90b	d6e352aa-7787-4e73-b539-2d5b3e711270	Two players are arguing in voice chat and it’s escalating. What steps do you take?	long_answer	\N	t	13	2026-02-21 03:20:05.001208
4ced9b77-39ac-4643-88a9-e48b5010371b	d6e352aa-7787-4e73-b539-2d5b3e711270	Do you have any additional comments to add to support your application?	long_answer	\N	t	14	2026-02-21 03:20:05.003808
259ff744-9824-487b-8a48-ffeae3a286b2	07909c0f-1577-4f4b-8019-8bf210e7de07	Why should we choose you over other applications?	long_answer	\N	t	9	2026-02-21 03:26:57.524787
31a58e4b-f0d6-4abe-b33b-af84da5bcb71	07909c0f-1577-4f4b-8019-8bf210e7de07	By ticking the box you have agreed that all work done for Tamaki Makaurau belongs to Tamaki Makaurau RP and any request to remove any development work done by you can be denied. 	checkbox	["Yes I Agree"]	t	10	2026-02-21 03:26:57.52669
796266a7-b8dc-4754-a9c7-63cec92223ee	4e5b7c5e-3633-4296-983a-ff5af2debc7a	How many hours can you put into a week?	short_answer	\N	t	3	2026-02-21 03:31:21.311636
8c4e7a73-8a33-4189-88f0-ecaa9c4a400c	4e5b7c5e-3633-4296-983a-ff5af2debc7a	How much do you think you can capture per week?	short_answer	\N	t	4	2026-02-21 03:31:21.314275
af02ddd5-4078-4213-8b7d-72e454c1831b	07909c0f-1577-4f4b-8019-8bf210e7de07	Discord ID:	short_answer	\N	t	0	2026-02-21 03:26:57.488315
d8cce326-026d-405e-8199-939088ef3c49	07909c0f-1577-4f4b-8019-8bf210e7de07	What is your IRL age?	short_answer	\N	t	1	2026-02-21 03:26:57.500709
28425759-8eb2-4a6a-8e11-73c90163b9ba	07909c0f-1577-4f4b-8019-8bf210e7de07	How many hours of the week can you put into development?	short_answer	\N	t	2	2026-02-21 03:26:57.50374
d69ff294-874f-47b9-87c8-f1ea3d3077a1	07909c0f-1577-4f4b-8019-8bf210e7de07	Have you had any previous staff interacting?  	short_answer	\N	t	3	2026-02-21 03:26:57.506227
1cfd39c2-9307-4131-87e2-27b911aeab3c	07909c0f-1577-4f4b-8019-8bf210e7de07	What experience do you have? Please provide details.	long_answer	\N	t	4	2026-02-21 03:26:57.509482
d717e53f-9358-4504-a36d-88b26f96922a	07909c0f-1577-4f4b-8019-8bf210e7de07	Have you developed for any servers before and what servers?	long_answer	\N	t	5	2026-02-21 03:26:57.512524
3e76004e-ee75-4380-8dc7-c57bfba5f48a	07909c0f-1577-4f4b-8019-8bf210e7de07	Why do you want to join the Development Team?	long_answer	\N	t	6	2026-02-21 03:26:57.515702
096fa99f-05a5-484f-8866-6449082b5fdb	07909c0f-1577-4f4b-8019-8bf210e7de07	What can you bring to the Development Team?	long_answer	\N	t	7	2026-02-21 03:26:57.518981
3debde4f-261f-4a1f-93e0-aa6690e01c21	07909c0f-1577-4f4b-8019-8bf210e7de07	What area in Development would you like to focus on?	checkbox	["Scripts", "EUP",  "Retexturing", "Vehicle Development", "MLO Development"]	t	8	2026-02-21 03:26:57.521839
13916fe8-477f-4f8b-bb80-7c47c03b5ca3	4e5b7c5e-3633-4296-983a-ff5af2debc7a	Why do you want to join the Social Media Team?	long_answer	["Yes I Agree"]	t	5	2026-02-21 03:31:21.317252
03e5eb0d-851d-42fa-9f56-bc42e8437002	4e5b7c5e-3633-4296-983a-ff5af2debc7a	Do you understand that joining the Social Media Team means that all work done for Tamaki Makaurau RP belongs to Tamaki Makaurau RP and any request to remove any content that you made for Tamaki Makaurau RP can be denied.	checkbox	["Yes I Agree"]	t	6	2026-02-21 03:32:53.369933
36fc7c94-bad4-40f5-8c94-496fc7ca0d72	d1f2daa7-79a8-43a1-91b8-102be7dcb609	Discord ID:	short_answer	\N	t	0	2026-02-21 03:33:27.343337
dfcc65ae-889b-4930-8d7c-b4b2175f28ce	d1f2daa7-79a8-43a1-91b8-102be7dcb609	IRL Age?	short_answer	\N	t	1	2026-02-21 03:35:23.041796
238fd201-5554-4575-8a30-1388375bf83e	d1f2daa7-79a8-43a1-91b8-102be7dcb609	Time in server?	short_answer	\N	t	2	2026-02-21 03:35:23.04504
a7b58d74-4063-47b6-b933-a160f01b0fb8	4e5b7c5e-3633-4296-983a-ff5af2debc7a	Discord ID:	short_answer	\N	t	0	2026-02-21 03:31:21.301217
2807d523-396b-4e91-a6d1-eb8921973ac0	4e5b7c5e-3633-4296-983a-ff5af2debc7a	What is your IRL age?	short_answer	\N	t	1	2026-02-21 03:31:21.305827
ca3256f3-a7ce-4c63-a60b-38a2874f33c5	4e5b7c5e-3633-4296-983a-ff5af2debc7a	Do you have previous experience? If so what server/s	short_answer	\N	t	2	2026-02-21 03:31:21.308975
e6ce1a66-e2eb-45ed-a5de-dcc23a1a6dab	d1f2daa7-79a8-43a1-91b8-102be7dcb609	How long have you been roleplaying (FiveM or elsewhere)?	short_answer	\N	t	3	2026-02-21 03:35:23.048032
a5c37ff1-954f-43aa-8c6c-9917fa2027eb	d1f2daa7-79a8-43a1-91b8-102be7dcb609	Have you been in any other advanced civilian or whitelist roles before?	short_answer	\N	t	4	2026-02-21 03:35:23.050484
db183fe1-2f9e-4614-a7f5-0ee20de3c817	d1f2daa7-79a8-43a1-91b8-102be7dcb609	Why do you want to join CivX?	long_answer	\N	t	5	2026-02-21 03:35:23.053207
b3e35a27-9c27-4b31-bcfa-73bca8acde5e	d1f2daa7-79a8-43a1-91b8-102be7dcb609	What type of RP scenes are you most interested in running with CivX? (e.g. racing, gang RP, legal business, events, etc.)	long_answer	\N	t	6	2026-02-21 03:35:23.056314
86a51e83-9a55-49a2-a063-59bbe22b911d	d1f2daa7-79a8-43a1-91b8-102be7dcb609	You are allowed to use supercars, aircraft, and heavier weapons. How would you ensure you still keep things realistic and fair?	long_answer	\N	t	7	2026-02-21 03:35:23.059263
0bd044f7-8c07-4480-aee1-8f0d18df4f7a	d1f2daa7-79a8-43a1-91b8-102be7dcb609	What does being part of CivX mean to you in terms of responsibility?	long_answer	\N	t	8	2026-02-21 03:35:23.062236
9b6bbfcb-8abd-4361-93cb-88c0d3b80e2c	9c11c1b6-4ee8-4295-ab48-5d840b855521	Gang Theme / Type: (e.g: Street gang, MC, organized crime, cartel, etc.)	short_answer	\N	t	1	2026-02-21 03:39:52.124641
25e48bf7-3fdc-4fdb-98c1-5dfda8f4aeaa	9c11c1b6-4ee8-4295-ab48-5d840b855521	Gang Leaders	short_answer	\N	t	2	2026-02-21 03:39:52.127149
20b2fac4-3f04-4c5c-b443-6b38a09b9cd1	9c11c1b6-4ee8-4295-ab48-5d840b855521	Gang Colours (Include hex codes or clothing pieces if possible.)	short_answer	\N	t	3	2026-02-21 03:39:52.130273
f1afb875-15fc-4e7a-9c06-0c1534065950	9c11c1b6-4ee8-4295-ab48-5d840b855521	What's your gang backstory?	long_answer	\N	t	4	2026-02-21 03:39:52.133182
8808feb7-1baa-46f7-bba0-54db521258e6	9c11c1b6-4ee8-4295-ab48-5d840b855521	Gang Name:	short_answer	\N	t	0	2026-02-21 03:39:52.113153
45e24550-59d2-42f5-9ba3-bf9bf6163033	9c11c1b6-4ee8-4295-ab48-5d840b855521	Where's your gang territory?	short_answer	\N	t	5	2026-02-21 03:39:52.136192
39f5c580-8e98-4722-ab75-0ffadf29c08f	9c11c1b6-4ee8-4295-ab48-5d840b855521	What's your primary objective?	long_answer	\N	t	6	2026-02-21 03:39:52.139879
8804fd6e-2aab-4de3-8163-e1de89022202	9c11c1b6-4ee8-4295-ab48-5d840b855521	What makes your gang unique compared to others?	long_answer	\N	t	7	2026-02-21 03:39:52.143005
30d1fe2d-f40d-4301-8dd3-02049f09722a	9c11c1b6-4ee8-4295-ab48-5d840b855521	How will your gang contribute positively to the RP community?	long_answer	\N	t	8	2026-02-21 03:39:52.145828
b0047477-d4f0-461d-91d7-f528793f371d	9c11c1b6-4ee8-4295-ab48-5d840b855521	How will you handle conflicts with other gangs or players?	long_answer	\N	t	9	2026-02-21 03:39:52.148826
7b35fa45-f15b-4447-af00-9cb0a56e7fd9	9c11c1b6-4ee8-4295-ab48-5d840b855521	What are your plans for growth and RP development within the gang?	long_answer	\N	t	10	2026-02-21 03:39:52.151324
8b0447ba-9a21-421f-aa24-2c25b41f7c09	9c11c1b6-4ee8-4295-ab48-5d840b855521	Do you have a Gang Discord for your gang? If yes, please provide a invite link to the Discord Server.	short_answer	\N	t	11	2026-02-21 03:39:52.154177
ebf66ed0-cad7-46f6-9ddf-fa6021a01c15	9c11c1b6-4ee8-4295-ab48-5d840b855521	Do you have EUP, MLO's or/and Vehicles planned? If yes, please ticket the box/s that apply to you.	checkbox	["Gang EUP", "Gang MLO", "Gang Vehicle/s"]	t	12	2026-02-21 03:39:52.15653
\.


--
-- Data for Name: support_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_submissions (id, form_id, user_id, status, answers, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_role_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_role_assignments (id, user_id, role_id, assigned_by, assigned_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, discord_id, username, discriminator, avatar, email, roles, access_token, refresh_token, created_at, updated_at, website_roles, is_staff, staff_tier, staff_tiers, display_name) FROM stdin;
6fd7824a-200f-45bc-9871-03ae05bc97ed	95439370395320320	lucifer0381	0	034377d3b6d24d3d96d62bb37e4f4192	lauriewilton@gmail.com	{1465161752818745344,1423193195566862466,1066150585226764389,1423193184229654598,1129267841695223878,1101314765537681448,1436528928419217513,1409791795222810714,1436528931913203792,1046442733251858483,1027902719010279445,1147046997182906389,1438320158212096214,1436528047049412729,1437310221864407162,1418828057170415739,1259512907776000124,1370289820739309630}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.xMhzig1w49u6nF3wcVN3XoZU0jdi8D	sRtUlWbhqppQyC87WyGdBouSBI4KzJ	2026-02-10 08:12:29.779749	2026-02-16 02:02:21.249	{police}	t	development	{development}	\N
e41c0f1f-5223-41c6-9544-3129448eb140	518249306021691426	toenailpapi	0	bd2125a517ffcba64f8845b999e53deb	ansaart26@gmail.com	{1410115394399633408,1465162590635425793,1423193195566862466,1409056959294083203,1409055778471542794,1402861069008900237,1465161766873989140,1027902719010279445,1413660888300257432,1423898475116105890,1471749143923003558,1101314765537681448,1046442733251858483,1083564774681493685,1413662561714307132,1409784291147251773,1409785665264160829,1044543042314588230,1129267841695223878,1423193184229654598,1465163226013634631,1465161710582366299,1418828057170415739,995318088897675387,1259512907776000124}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.kU6Wkn0YvQGOSVN5qbg2BsA7KCPACI	IUGMN9xvq0EqKLsAmpq98lgUZX3MW6	2026-02-09 09:42:19.265269	2026-02-23 09:03:10.94	{aos,police,admin,towing,traffic}	t	director	{director}	toenailpapi
80c1a428-1345-4777-8f84-10ff81fa5e10	1013264794121404418	dirtydeedindustrys	0	c935297c3e33390b125c02ae1787a860	blairbillows@hotmail.com	{1027902716665663488,1474305322704175104,1423193195566862466,1465162818935591056,1027902719010279445,1147046997182906389,1472545028567203871,1101314765537681448,1046442733251858483,1474307982694158397,1404050461581115453,1370289820739309630,1027908734804037702,1129267841695223878,1423193184229654598,1436528931913203792,1438320158212096214,1436528928419217513,1436528047049412729,1437310221864407162,1418828057170415739,1259512907776000124}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.hc6eKaP3YXIsK4HDGWUzOykMhijrSC	ZAdBZ9V0IZrKS38WUYDekiIuLIg2cE	2026-02-12 07:56:06.389941	2026-02-23 01:01:25.14	{ems,police,traffic,towing,fire}	t	development	{development}	\N
e7bb17c3-ef1b-4bc0-b324-92cb54c298a3	847698626015920129	sireasyy	0	4c1bd1d03379abc9a9baf266686c22a2	hunterseth791@gmail.com	{1027902716665663488,1047131637625925632,1423193195566862466,1418497891806347365,1027908734804037702,1129267841695223878,1101314765537681448,1423193184229654598,1465161771567550474,1384035820071161867,1046442733251858483,1027902719010279445,1081891303522041977,1418828057170415739,1259512907776000124}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.mdR2VgfDLO9nZneJf5K6fbWwOSPIix	zgxwSjfLHTsWzyrDAQICuwDfhuhPXH	2026-02-12 07:48:43.318796	2026-02-23 09:03:11.06	{ems,police,fire,aos,towing,traffic}	t	manager	{manager}	\N
64f19604-5cc0-40d2-8e67-aa7d5c1b4e38	1051612547641520212	jackson7181	0	ea1d12845643a4a6d9f88546c0b45f97	fivemrp234@gmail.com	{1047131637625925632,1423193195566862466,1418497891806347365,1129267841695223878,1027912314067882055,1101314765537681448,1423193184229654598,1413664099065401484,1046442733251858483,1404050461581115453,1027902719010279445,1418828057170415739,1259512907776000124,1474307982694158397,1370289820739309630}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.YDQB5n3jqma54OmJeeuYyuPu86T1lA	tmDtupSH81tX8KcH4ybEZWSwWyYvmF	2026-02-10 09:34:48.587519	2026-02-23 09:03:10.713	{police,fire,ems,aos,towing,traffic}	t	manager	{manager,development}	\N
06391685-1436-4035-a3af-dc6ad6bf42f6	1256073057651392634	mr_evil1	0	33a72a28daedfb10830638135ef881d5	ronanbooth12@gmail.com	{1027902716665663488,1423193195566862466,1423193184229654598,1027908734804037702,1101314765537681448,1436528928419217513,1465161771567550474,1436528931913203792,1046442733251858483,1027902719010279445,1147046997182906389,1265956194413973527,1437310221864407162,1418828057170415739,1259512907776000124}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.wxP2qPJgkjWpIaqXgnGIqjinvVDqnz	kF2Yj8B6UlYGGrNzvfutFJdfejvqh3	2026-02-12 07:46:19.872777	2026-02-16 02:02:21.672	{ems,fire,police}	t	support	{support}	\N
875bac79-7706-4090-8856-dca2ad880eec	1117302869088030760	ironreboot	0	c40be7521146f45023979384fadb33ad	jimmy.riley06@outlook.co.nz	{1027902716665663488,1423193195566862466,1027908734804037702,1421028127110598727,1101314765537681448,1423193184229654598,1465161771567550474,1032229247269486603,1465162818935591056,1046442733251858483,1027902719010279445,1081891303522041977,1418828057170415739,1259512907776000124,1370289820739309630}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.n1reBC1y4QnyKnApF794yUXNYBSW9t	ij97fyoBh7wOhmguli1hm0veQMshyD	2026-02-10 08:18:17.489496	2026-02-16 02:02:21.842	{ems,fire,police}	t	administrator	{administrator,development}	\N
a3423273-41d2-4cdd-ba6e-1cf5512de15e	904213480884826133	mrjrg1992	0	1469bfb8b2bc19db6678757579dd9763	jackrobbiegale@gmail.com	{1410115394399633408,1465161763996827649,1423193195566862466,1418497891806347365,1027908734804037702,1414149579707781190,1101314765537681448,1423193184229654598,1438319237897912522,1465164357133664398,1066150589437853777,1046442733251858483,1465163230975496212,1027902719010279445,1083564774681493685,1409791795222810714,1418828057170415739}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.l96oEG94saUDV42xLzMCNOv8zDOM3x	LQWeK7LQGGxsmBKzcXAsF2qV2pFhom	2026-02-12 07:54:39.935519	2026-02-16 02:02:21.957	{aos,fire,police}	f	\N	{}	\N
6a10b692-9506-40bd-a05c-06e43896958d	791460361487777853	nokiaplayer2	0	42438b094ad4fac2f129f92880d8035d	npuvalic10@gmail.com	{1027902716665663488,1423193195566862466,1423193184229654598,1027908734804037702,1101314765537681448,1465162815831805992,1465161771567550474,1046442733251858483,1027902719010279445,1265956194413973527,1418828057170415739,1259512907776000124}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.920mlFHUK7RLQpI5KP43Ay5NP5npHA	v631JR4XiccTO5iRxxWqN6VG5tvE3Y	2026-02-10 08:17:51.28798	2026-02-16 02:02:22.082	{ems,fire,police}	t	support	{support}	\N
7fd58eb9-dac3-46e2-aa82-4578ce7122be	697790422893723680	ghstx_x	0	343a9b972f797a0aa1c99879fae107aa	bridiewalsh@hotmail.co.nz	{1423193195566862466,1027908734804037702,1129267841695223878,1101314765537681448,1423193184229654598,1436528928419217513,1046442733251858483,1474308125627646067,1027902719010279445,1438320158212096214,1404050461581115453,1436528047049412729,1418828057170415739,1259512907776000124,1474307982694158397,1370289820739309630,1472545028567203871}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.NbXznW4hNKf1s2TuNr39xgqDRiAof1	KwUX0r2JuCVP91BEFq0Y7xIIpAq2xO	2026-02-10 08:40:24.648841	2026-02-23 09:03:11.828	{fire,police,towing,traffic}	t	development	{development}	ghstx_x
480a4aac-9b6a-4855-9780-22f7a22345d6	524755160182816791	kcnz_2000	0	e9a7c99490713b5dfd9d1f0412161e7d	nzflightteaminfiniteflight@gmail.com	{1047131637625925632,1423193195566862466,1066150585226764389,1423193184229654598,1418497891806347365,1101314765537681448,1409055778471542794,1418828057170415739,1436528931913203792,1046442733251858483,1465162812685815828,1027902719010279445,1081891303522041977,1409791795222810714,1465161710582366299,1259512907776000124,1409784291147251773}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.uQCUUHK3qa6BqgMwXRl0fybZ9115zx	09USKcgE8oFSLFhw31UzmJjgT9yy5R	2026-02-10 08:52:07.242084	2026-02-16 02:02:22.547	{police,fire,ems,aos}	t	manager	{manager}	\N
99771803-70f0-4ad3-a8dd-5ac014651e0c	856764808494186517	shadow._444	0	\N	tynan.wolken@gmail.com	{1027902716665663488,1421038519161327616,1423193195566862466,1066150595964186784,1418497891806347365,1423193184229654598,1101314765537681448,1418828057170415739,1402861069008900237,1046442733251858483,1402861198004846612,1027902719010279445,1465161774960742645,1265956194413973527,1465162726761566457,1409791795222810714,1421038312835121243,1128593557884780574}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.mtE5Pfgv7jLkBU3nH3pbxDiV1Hc8CO	SbmcO8Xa1RFvVSPfFRfAnbbzIptCxV	2026-02-10 08:11:16.208731	2026-02-16 02:02:22.701	{ems,police}	t	support	{support}	\N
71c3b3c6-9f18-4335-9789-3c50153581f1	802683730770526268	hayden.b	0	67074f3939044d620472446f4571f60c	hayds.bailey@gmail.com	{1027902716665663488,1465162590635425793,1423193195566862466,1066150595964186784,1418497891806347365,1423193184229654598,1101314765537681448,1409055778471542794,1046442733251858483,1402861198004846612,1027902719010279445,1465161774960742645,1436528047049412729,1409791795222810714,1418828057170415739,1409784291147251773,1128593557884780574}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.8LSNxg71Phgpx3k8IXRJda05RU732A	6lQqPxFMA16eHi83SOXQzYa8NPO4LF	2026-02-12 07:39:11.564708	2026-02-16 02:02:22.819	{ems,police}	f	\N	{}	\N
ff376b2a-c03b-4f8e-b2ca-ed2fac2338bf	1166609055637311538	hazza0631	0	684c847c5a96b210827be35dd9a5d5bd	harrisonoverweel11@gmail.com	{1423193195566862466,1418497891806347365,1423193184229654598,1027908734804037702,1101314765537681448,1465163226013634631,1438319237897912522,995318088897675387,1066150589437853777,1046442733251858483,1261605499120521236,1409791795222810714,1418828057170415739}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.jQlp3NPjzYbsSva2KneA6hbuMO3Gh1	kfkLB9qJ59anmsDeYkN6fAdV31nVVV	2026-02-12 11:11:12.39384	2026-02-16 02:02:23.083	{fire}	f	\N	{}	\N
33dfd088-4c86-43a7-a15b-4ed520efa47e	728468678580109394	.durry.	0	7dd3a99627c136c18cc49d10cb106b62	joelperrett22@gmail.com	{1423193195566862466,1423193184229654598,1129267841695223878,1101314765537681448,1275050373295509514,1465161771567550474,995318088897675387,1081891297322881135,1046442733251858483,1409055819021942836,1027902719010279445,1413660678970933268,1413660890053480659,1413660677117055096,1418828057170415739,1259512907776000124,1409784291147251773}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.MPO7y1FQTcxYj07rexeIVC5Jp2WW6B	pWexyHq8D7y91qRerwEfWbn6PYv3ye	2026-02-13 06:12:59.812643	2026-02-16 02:02:23.206	{admin,police}	t	executive	{executive}	\N
eb23c389-fbdf-4701-b798-8d856dfaabbe	725249686822322227	racernz	0	90f0c0886abb54ecd51dc915d10c01f0	jayjay.gamer09@gmail.com	{1027902716665663488,1047131637625925632,1423193195566862466,1409056959294083203,1261605499120521236,1027902719010279445,1147046997182906389,1101314765537681448,1046442733251858483,1409784291147251773,1409785665264160829,1370289820739309630,1027908734804037702,1129267841695223878,1421028127110598727,1423193184229654598,1436528931913203792,1081891303522041977,1418497891806347365,1436528928419217513,1259120047037874287,1436528047049412729,1437310221864407162,1418828057170415739,1259512907776000124}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.8tTo7KKkRBDNK8gxE0kZUs0YPezYgL	ze2sXKFQsqfwKT1YJhCrdJPthaxxf6	2026-02-23 08:20:57.734807	2026-02-23 09:04:29.48	{ems,police,fire,aos,towing,traffic,admin}	t	manager	{manager,development}	racernz
26a58610-36f2-4e0f-a40c-9e7995a74f1c	674018632837103666	vyxoce	0	d9b7c0e08d1160a2fe13991e2b8fce33	jacobotto55@gmail.com	{1027902716665663488,1421038519161327616,1423193195566862466,1465163255038345362,1027902719010279445,1147046997182906389,1128593557884780574,1066150595964186784,1101314765537681448,1046442733251858483,1465161777133387828,1027908734804037702,1423193184229654598,1436528931913203792,1438320158212096214,1409791795222810714,1421038312835121243,1436528047049412729,1436528928419217513,1465162742041280746,1473001605518594153,1465162726761566457,1437310221864407162,1418828057170415739}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.aSJawMhRb1x2ThjvV4UzulF1PTBLfM	U1Fbmc2SGnoOyp01iJcGZovtjo3ygh	2026-02-17 04:37:08.613286	2026-02-23 09:03:12.182	{ems,police,fire}	f	\N	{}	\N
fb25c031-f05c-4521-8824-8fead841287b	605361500210855937	ice_breaker47	0	51209c9152d3385605150517dcf3568d	aidenkeddie@gmail.com	{1027902716665663488,1423193195566862466,1032229247269486603,1261605499120521236,1027902719010279445,1147046997182906389,1413660678970933268,1101314765537681448,1046442733251858483,1409055819021942836,1409784291147251773,1409785665264160829,1370289820739309630,1027908734804037702,1421028127110598727,1423193184229654598,1436528931913203792,1413660890053480659,1438320158212096214,1081891303522041977,1436528928419217513,1413660677117055096,1436528047049412729,1437310221864407162,1418828057170415739,1259512907776000124}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.X6LRQapR03OJtdFCZAYrR1vUFToU6I	ppzYzS3L8RbSVJZR4qy8kQ4VyleqZ6	2026-02-11 07:35:51.908577	2026-02-23 09:03:12.492	{ems,police,fire}	t	administrator	{administrator,development}	ice_breaker47
5175ba5a-87ca-4c0c-a715-decdc682d9d8	1420973504051810346	lowerhutt_	0	aec7d0ef2d1a503abce300e4ae1c02b9	zane.streeting@gmail.com	{1423193195566862466,1066150585226764389,1423193184229654598,1409791795222810714,1101314765537681448,1436528928419217513,1465161761627050024,1436528931913203792,1046442733251858483,1027902719010279445,1083564774681493685,1147046997182906389,1438320158212096214,1436528047049412729,1437310221864407162,1418828057170415739}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.zaZCVVhWqSLPx0OvoS5wEjrSu0iKRJ	no7jUTmEgBTlaouIyBlD79jmmZoxus	2026-02-23 10:23:02.58064	2026-02-23 10:23:02.58064	{police}	f	\N	{}	lowerhutt_
30e9cd02-37cd-42f4-a82d-fa4541434e9c	318228010803396609	d3adx	0	2a59e2dd40861ea765f77174f311e79e	d3adxr1d3r@gmail.com	{1423193195566862466,1434799216504475780,1409055778471542794,1275050373295509514,1028456849709731860,1027902719010279445,1147046997182906389,1101314765537681448,1046442733251858483,1409055819021942836,1434472612020621363,1409784291147251773,1370289820739309630,1027908734804037702,1129267841695223878,1423193184229654598,1436528931913203792,1436528928419217513,1418828057170415739,1081891297322881135,1465161774960742645,1436528047049412729,1437310221864407162,995318088897675387,1259512907776000124}	MTQ2MzQ2MzIyMzg5MzE2NDEwNQ.kKjjG0uSldDamIDgHBdiQvosLi1mC0	rr2QMYm4l6On4HfN5gRoQgUoPSKvZt	2026-01-30 08:50:08.057157	2026-02-23 23:18:36.54	{admin,police,fire}	t	executive	{executive,development}	d3adx
\.


--
-- Data for Name: website_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.website_roles (id, name, display_name, description, color, permissions, staff_tier, discord_role_id, priority, is_active, created_at) FROM stdin;
064d1685-9478-49da-8cfb-1eab7ca92404	test	test	tes	#6f24a8	{admin}	\N	\N	0	f	2026-02-09 09:53:33.21503
8f670e4c-15be-4568-80d2-5c553c192f57	webiste_master	Website Master Access		#6b7280	{admin}	\N	1259120047037874287	0	t	2026-02-23 09:02:44.892299
11048bf4-f777-428a-b11f-aa947389344c	moderator	Moderator	Server Moderator	#e06f0b	{}	moderator	1081891294613348352	5	t	2026-02-09 12:32:47.613746
c673d158-b039-4a85-8380-b85635322910	support	Support	Support Staff	#02db3c	{}	support	1265956194413973527	6	t	2026-02-09 12:32:47.613746
8ce9a513-8b2c-4f3a-98a9-9eee68bfd656	development	Development Team		#1abc9c	{}	development	1370289820739309630	7	t	2026-02-09 23:42:48.859347
906ccf46-6585-450b-b980-a7aac54bf845	executivee	Executive		#5e088a	{admin}	executive	1275050373295509514	2	t	2026-02-09 10:44:14.341481
ba843b05-16b4-4a44-8144-a6da20fc7d09	administrator	Administrator	Server Administrator	#3498db	{}	administrator	1032229247269486603	4	t	2026-02-09 12:32:47.613746
52ff38d8-a383-4c9b-a89b-236447447cc0	executive	Executive		#6b7280	{admin,police,fire,ems,aos,towing,traffic}	executive	1275050373295509514	0	f	2026-01-30 09:48:25.277023
bc66c980-dc8b-49d8-a201-d57c46f6623b	director	Director		#f1c40f	{admin,towing,traffic}	director	1044543042314588230	0	t	2026-02-09 10:29:06.76628
219d514b-f418-4500-9fb4-a8223af687f7	manager	Manager	Server Manager	#b10e1c	{police,fire,ems,aos,towing,traffic}	manager	1047131637625925632	3	t	2026-02-09 12:32:47.613746
\.


--
-- Name: admin_settings admin_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_unique UNIQUE (key);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: aos_squads aos_squads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aos_squads
    ADD CONSTRAINT aos_squads_pkey PRIMARY KEY (id);


--
-- Name: application_forms application_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_forms
    ADD CONSTRAINT application_forms_pkey PRIMARY KEY (id);


--
-- Name: application_messages application_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_messages
    ADD CONSTRAINT application_messages_pkey PRIMARY KEY (id);


--
-- Name: application_questions application_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_questions
    ADD CONSTRAINT application_questions_pkey PRIMARY KEY (id);


--
-- Name: application_submissions application_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_submissions
    ADD CONSTRAINT application_submissions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_unique UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: form_managers form_managers_form_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_managers
    ADD CONSTRAINT form_managers_form_id_user_id_unique UNIQUE (form_id, user_id);


--
-- Name: form_managers form_managers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_managers
    ADD CONSTRAINT form_managers_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ranks ranks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ranks
    ADD CONSTRAINT ranks_pkey PRIMARY KEY (id);


--
-- Name: role_mappings role_mappings_discord_role_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_mappings
    ADD CONSTRAINT role_mappings_discord_role_id_unique UNIQUE (discord_role_id);


--
-- Name: role_mappings role_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_mappings
    ADD CONSTRAINT role_mappings_pkey PRIMARY KEY (id);


--
-- Name: roster_members roster_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roster_members
    ADD CONSTRAINT roster_members_pkey PRIMARY KEY (id);


--
-- Name: server_updates server_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.server_updates
    ADD CONSTRAINT server_updates_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: sops sops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sops
    ADD CONSTRAINT sops_pkey PRIMARY KEY (id);


--
-- Name: support_faqs support_faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_faqs
    ADD CONSTRAINT support_faqs_pkey PRIMARY KEY (id);


--
-- Name: support_forms support_forms_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_forms
    ADD CONSTRAINT support_forms_key_key UNIQUE (key);


--
-- Name: support_forms support_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_forms
    ADD CONSTRAINT support_forms_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_questions support_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_questions
    ADD CONSTRAINT support_questions_pkey PRIMARY KEY (id);


--
-- Name: support_submissions support_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_submissions
    ADD CONSTRAINT support_submissions_pkey PRIMARY KEY (id);


--
-- Name: user_role_assignments user_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: users users_discord_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_discord_id_unique UNIQUE (discord_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: website_roles website_roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.website_roles
    ADD CONSTRAINT website_roles_name_unique UNIQUE (name);


--
-- Name: website_roles website_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.website_roles
    ADD CONSTRAINT website_roles_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- PostgreSQL database dump complete
--

\unrestrict 7YuDX1AkhO08d9S4vYegJXeHYxXOo2ctudtIbg0ua8JChlYLreuY16E4o0jcZw8

